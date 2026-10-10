import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STATUS_CLASS: Record<string, string> = {
  PENDING: "status-badge status-pending",
  APPROVED: "status-badge status-approved",
  REJECTED: "status-badge status-rejected",
};

export default async function MyExpensesPage() {
  const session = await auth();
  const t = await getTranslations("ClientExpenses");
  const common = await getTranslations("Common");
  const statusLabel: Record<string, string> = {
    PENDING: t("statusPending"),
    APPROVED: t("statusApproved"),
    REJECTED: t("statusRejected"),
  };

  if (
    !session?.user ||
    session.user.role !== "CLIENT" ||
    !session.user.clientProfileId
  ) {
    return (
      <main className="state-page">
        <div className="state-card">
          <p className="text-sm text-slate">{common("unauthorized")}</p>
        </div>
      </main>
    );
  }

  const expenses = await prisma.expense.findMany({
    where: { clientId: session.user.clientProfileId },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="flex flex-col gap-6 border-b border-hairline-soft pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm text-slate">{t("intro")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* This native anchor downloads the CSV Route Handler response. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/expenses/export" className="button-secondary">
              {t("exportCsv")}
            </a>
            <Link href="/app/expenses/scan" className="button-cream">
              {t("scanReceipt")}
            </Link>
            <Link href="/app/expenses/new" className="button-primary">
              {t("newExpense")}
            </Link>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state mt-8">
            <span className="badge-cream">{t("emptyBadge")}</span>
            <h2 className="mt-4 text-xl font-medium text-ink">{t("empty")}</h2>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3" aria-label={t("title")}>
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="card-base flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-ink">
                    {expense.description}
                  </p>
                  <p className="mt-1 text-sm text-slate">
                    {expense.category.name} · {expense.amount.toFixed(2)}{" "}
                    {expense.currency} ·{" "}
                    {new Date(expense.date).toLocaleDateString("es-ES")}
                  </p>
                  {expense.status === "REJECTED" && expense.reviewNote && (
                    <p className="mt-2 text-sm text-primary-deep">
                      {t("reasonLabel")}: {expense.reviewNote}
                    </p>
                  )}
                </div>
                <span className={STATUS_CLASS[expense.status]}>
                  {statusLabel[expense.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
