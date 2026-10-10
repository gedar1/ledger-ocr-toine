/**
 * Idempotent seed script.
 *
 * Creates (or updates, via upsert) a single ACCOUNTANT user and a set of
 * default Dutch BTW categories scoped to that accountant. Safe to run
 * multiple times: re-running never creates duplicates.
 *
 * The accountant email/password are dev-only seed credentials, never read
 * from real .env secrets beyond DATABASE_URL. See README.md for details.
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_ACCOUNTANT_EMAIL =
  process.env.SEED_ACCOUNTANT_EMAIL ?? "accountant@ledger-ocr.local";
const SEED_ACCOUNTANT_PASSWORD =
  process.env.SEED_ACCOUNTANT_PASSWORD ?? "dev-only-password-123";

type SeedCategory = {
  name: string;
  defaultBtwRate: number;
  defaultDeductible: boolean;
  icon: string;
  color: string;
};

const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    name: "Kantoorbenodigdheden",
    defaultBtwRate: 21,
    defaultDeductible: true,
    icon: "briefcase",
    color: "#6366f1",
  },
  {
    name: "Reiskosten",
    defaultBtwRate: 0,
    defaultDeductible: true,
    icon: "car",
    color: "#22c55e",
  },
  {
    name: "Representatie",
    defaultBtwRate: 21,
    defaultDeductible: false,
    icon: "users",
    color: "#f59e0b",
  },
  {
    name: "Verzekeringen",
    defaultBtwRate: 21,
    defaultDeductible: true,
    icon: "shield",
    color: "#0ea5e9",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_ACCOUNTANT_PASSWORD, 10);

  const accountant = await prisma.user.upsert({
    where: { email: SEED_ACCOUNTANT_EMAIL },
    update: {},
    create: {
      email: SEED_ACCOUNTANT_EMAIL,
      password: passwordHash,
      name: "Default Accountant",
      role: Role.ACCOUNTANT,
      locale: "nl",
    },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        accountantId_name: {
          accountantId: accountant.id,
          name: category.name,
        },
      },
      update: {
        defaultBtwRate: category.defaultBtwRate,
        defaultDeductible: category.defaultDeductible,
        icon: category.icon,
        color: category.color,
      },
      create: {
        accountantId: accountant.id,
        name: category.name,
        defaultBtwRate: category.defaultBtwRate,
        defaultDeductible: category.defaultDeductible,
        icon: category.icon,
        color: category.color,
      },
    });
  }

  const [userCount, categoryCount] = await Promise.all([
    prisma.user.count({ where: { role: Role.ACCOUNTANT } }),
    prisma.category.count({ where: { accountantId: accountant.id } }),
  ]);

  console.log(
    `Seed complete: accountant="${accountant.email}" accountantUserCount=${userCount} categoryCount=${categoryCount}`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
