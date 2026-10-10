/**
 * One-off verification script for FEAT-003's multi-tenant isolation
 * requirement. Exercises the exact same Prisma WHERE-clause scoping used
 * by GET/POST /api/expenses/route.ts and POST /api/expenses/[id]/review:
 * seeds two accountants, each with their own client and expense, then
 * asserts isolation holds in both directions:
 *
 *  1. A CLIENT-scoped query (where: { clientId }) never returns the other
 *     client's expense.
 *  2. An ACCOUNTANT querying ?clientId=<other accountant's client> is
 *     rejected by the ownership check (ClientProfile.accountantId !==
 *     session.user.id) before any expense rows are read.
 *  3. An ACCOUNTANT querying ?clientId=<own client> only sees that
 *     client's own expense.
 *
 * Run with: npx tsx scripts/verify-isolation.ts
 *
 * Creates its own accountant/client/category/expense fixtures (unique
 * emails per run) and cleans them up afterward, so it's safe to re-run.
 */
import crypto from "crypto";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createFixture(label: string) {
  const suffix = crypto.randomBytes(4).toString("hex");

  const accountant = await prisma.user.create({
    data: {
      email: `verify-accountant-${label}-${suffix}@ledger-ocr.local`,
      password: await bcrypt.hash("irrelevant", 10),
      name: `Verify Accountant ${label}`,
      role: Role.ACCOUNTANT,
      locale: "nl",
    },
  });

  const category = await prisma.category.create({
    data: {
      name: `Verify Category ${label}`,
      accountantId: accountant.id,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: `verify-client-${label}-${suffix}@ledger-ocr.local`,
      password: await bcrypt.hash("placeholder", 10),
      name: `Verify Client ${label}`,
      role: Role.CLIENT,
      clientProfile: {
        create: {
          businessName: `Verify BV ${label}`,
          status: "ACTIVE",
          accountantId: accountant.id,
        },
      },
    },
    include: { clientProfile: true },
  });

  const clientProfile = clientUser.clientProfile!;

  const expense = await prisma.expense.create({
    data: {
      amount: 42.5,
      description: `Verify expense ${label}`,
      categoryId: category.id,
      clientId: clientProfile.id,
      status: "PENDING",
    },
  });

  return { accountant, clientUser, clientProfile, category, expense };
}

async function cleanup(fixture: Awaited<ReturnType<typeof createFixture>>) {
  await prisma.expense.deleteMany({ where: { clientId: fixture.clientProfile.id } });
  await prisma.category.deleteMany({ where: { id: fixture.category.id } });
  await prisma.clientProfile.deleteMany({ where: { id: fixture.clientProfile.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.accountant.id, fixture.clientUser.id] } },
  });
}

/** Mirrors GET /api/expenses for a CLIENT session: where: { clientId }. */
async function listAsClient(clientProfileId: string) {
  return prisma.expense.findMany({ where: { clientId: clientProfileId } });
}

/**
 * Mirrors GET /api/expenses?clientId=X for an ACCOUNTANT session: verifies
 * ClientProfile.accountantId === session.user.id before returning
 * anything, else returns the 403 sentinel.
 */
async function listAsAccountant(accountantId: string, clientId: string) {
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    select: { accountantId: true },
  });
  if (!clientProfile || clientProfile.accountantId !== accountantId) {
    return { status: 403 as const, expenses: [] };
  }
  const expenses = await prisma.expense.findMany({ where: { clientId } });
  return { status: 200 as const, expenses };
}

async function main() {
  let allPassed = true;

  const a = await createFixture("A");
  const b = await createFixture("B");

  try {
    // Case 1: client A's scoped query never returns client B's expense.
    const clientAExpenses = await listAsClient(a.clientProfile.id);
    const case1 =
      clientAExpenses.length === 1 &&
      clientAExpenses[0].id === a.expense.id &&
      !clientAExpenses.some((e) => e.id === b.expense.id);
    console.log(`[Case 1] client A's GET only returns client A's expense: ${case1 ? "PASS" : "FAIL"}`);
    allPassed = allPassed && case1;

    // Case 1b: same check in the other direction, for good measure.
    const clientBExpenses = await listAsClient(b.clientProfile.id);
    const case1b =
      clientBExpenses.length === 1 &&
      clientBExpenses[0].id === b.expense.id &&
      !clientBExpenses.some((e) => e.id === a.expense.id);
    console.log(`[Case 1b] client B's GET only returns client B's expense: ${case1b ? "PASS" : "FAIL"}`);
    allPassed = allPassed && case1b;

    // Case 2: accountant A querying accountant B's client is rejected
    // with 403, before any expense rows are returned.
    const crossTenant = await listAsAccountant(a.accountant.id, b.clientProfile.id);
    const case2 = crossTenant.status === 403 && crossTenant.expenses.length === 0;
    console.log(
      `[Case 2] accountant A querying accountant B's client -> 403: ${case2 ? "PASS" : "FAIL"}`
    );
    allPassed = allPassed && case2;

    // Case 3: accountant A querying their own client succeeds and returns
    // only that client's rows.
    const ownTenant = await listAsAccountant(a.accountant.id, a.clientProfile.id);
    const case3 =
      ownTenant.status === 200 &&
      ownTenant.expenses.length === 1 &&
      ownTenant.expenses[0].id === a.expense.id;
    console.log(
      `[Case 3] accountant A querying their own client -> 200 with only that tenant's rows: ${case3 ? "PASS" : "FAIL"}`
    );
    allPassed = allPassed && case3;

    console.log(allPassed ? "\nALL CASES PASS" : "\nSOME CASES FAILED");
    if (!allPassed) process.exitCode = 1;
  } finally {
    await cleanup(a);
    await cleanup(b);
  }
}

main()
  .catch((error) => {
    console.error("Verification script crashed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
