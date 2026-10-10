/**
 * One-off verification script for FEAT-002's invitation/activation
 * single-use and expiry logic. Exercises the exact same
 * activateInvitation() helper used by POST /api/activate/[token]/route.ts.
 *
 * Run with: npx tsx scripts/verify-invitation.ts
 *
 * Creates its own accountant/client/token fixtures (unique emails per run)
 * and cleans them up afterward, so it's safe to re-run.
 */
import crypto from "crypto";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { activateInvitation, hashToken } from "../src/lib/activation";

const prisma = new PrismaClient();

async function createFixture(expiresAt: Date) {
  const suffix = crypto.randomBytes(4).toString("hex");
  const accountant = await prisma.user.create({
    data: {
      email: `verify-accountant-${suffix}@ledger-ocr.local`,
      password: await bcrypt.hash("irrelevant", 10),
      name: "Verify Accountant",
      role: Role.ACCOUNTANT,
      locale: "nl",
    },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const client = await prisma.user.create({
    data: {
      email: `verify-client-${suffix}@ledger-ocr.local`,
      password: await bcrypt.hash("placeholder", 10),
      name: "Verify Client",
      role: Role.CLIENT,
      clientProfile: {
        create: {
          businessName: "Verify BV",
          status: "INVITED",
          accountantId: accountant.id,
          invitationTokens: {
            create: {
              tokenHash: hashToken(rawToken),
              expiresAt,
            },
          },
        },
      },
    },
    include: { clientProfile: true },
  });

  return { accountant, client, rawToken };
}

async function cleanup(accountantId: string, clientUserId: string) {
  await prisma.invitationToken.deleteMany({
    where: { clientProfile: { userId: clientUserId } },
  });
  await prisma.clientProfile.deleteMany({ where: { userId: clientUserId } });
  await prisma.user.deleteMany({ where: { id: { in: [accountantId, clientUserId] } } });
}

async function main() {
  let allPassed = true;

  // Case 1: valid token activates once, second attempt with the same
  // token fails.
  {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const { accountant, client, rawToken } = await createFixture(future);

    const first = await activateInvitation(rawToken, "a-new-password-123");
    const second = await activateInvitation(rawToken, "a-new-password-123");

    const firstOk = first.ok === true;
    const secondRejected = second.ok === false && second.error === "already_used";

    console.log(
      `[Case 1] first activation succeeds: ${firstOk ? "PASS" : "FAIL"}`
    );
    console.log(
      `[Case 1] second activation rejected as already used: ${secondRejected ? "PASS" : "FAIL"}`
    );
    allPassed = allPassed && firstOk && secondRejected;

    await cleanup(accountant.id, client.id);
  }

  // Case 2: expired token is rejected even on first attempt.
  {
    const past = new Date(Date.now() - 1000);
    const { accountant, client, rawToken } = await createFixture(past);

    const result = await activateInvitation(rawToken, "a-new-password-123");
    const rejected = result.ok === false && result.error === "invalid_or_expired";

    console.log(`[Case 2] expired token rejected: ${rejected ? "PASS" : "FAIL"}`);
    allPassed = allPassed && rejected;

    await cleanup(accountant.id, client.id);
  }

  console.log(allPassed ? "\nALL CASES PASS" : "\nSOME CASES FAILED");
  if (!allPassed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Verification script crashed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
