import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ClientExpenseAnalytics,
  type ClientExpenseAnalyticsExpense,
} from "@/components/client-expense-analytics";
import { ReviewActions } from "./review-actions";

const LOW_CONFIDENCE_THRESHOLD = 0.6;
type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";
type StatusFilter = "ALL" | ExpenseStatus;

function normalizeStatusFilter(
  value: string | string[] | undefined,
): StatusFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate === "PENDING" ||
    candidate === "APPROVED" ||
    candidate === "REJECTED"
  ) {
    return candidate;
  }
  return "ALL";
}

export default async function ClientExpensesReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ status?: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") notFound();

  const t = await getTranslations("ReviewPanel");
  const locale = await getLocale();
  const { clientId } = await params;
  const { status } = await searchParams;
  const statusFilter = normalizeStatusFilter(status);
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!client || client.accountantId !== session.user.id) notFound();

  const expenses = await prisma.expense.findMany({
    where: { clientId },
    include: { category: true },
    orderBy: { date: "desc" },
  });
  const analyticsExpenses: ClientExpenseAnalyticsExpense[] = expenses.map(
    (expense) => ({
      amount: expense.amount,
      date: expense.date,
      currency: expense.currency,
      categoryId: expense.categoryId,
      category: { name: expense.category.name },
      status: expense.status,
    }),
  );
  const counts = expenses.reduce(
    (summary, expense) => {
      summary.total += 1;
      if (expense.status === "PENDING") summary.pending += 1;
      if (expense.status === "APPROVED") summary.approved += 1;
      if (expense.status === "REJECTED") summary.rejected += 1;
      return summary;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 },
  );
  const filteredExpenses =
    statusFilter === "ALL"
      ? expenses
      : expenses.filter((expense) => expense.status === statusFilter);
  const pending = filteredExpenses
    .filter((expense) => expense.status === "PENDING")
    .sort((a, b) => {
      if (a.classificationConfidence == null) {
        return b.classificationConfidence == null
          ? a.date.getTime() - b.date.getTime()
          : -1;
      }
      if (b.classificationConfidence == null) return 1;
      const confidenceDifference =
        a.classificationConfidence - b.classificationConfidence;
      return confidenceDifference !== 0
        ? confidenceDifference
        : a.date.getTime() - b.date.getTime();
    });
  const reviewed = filteredExpenses.filter(
    (expense) => expense.status !== "PENDING",
  );
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });
  const numberFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: t("statusAll") },
    { value: "PENDING", label: t("statusPending") },
    { value: "APPROVED", label: t("statusApproved") },
    { value: "REJECTED", label: t("statusRejected") },
  ];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <header className="flex flex-col gap-6 border-b border-hairline-soft pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
              {t("expensesFor", { businessName: client.businessName })}
            </h1>
            <p className="mt-3 text-sm text-slate">
              {t("contactLabel")}: {client.user.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/clients" className="button-secondary">
              {t("backToClients")}
            </Link>
            <a
              href={`/api/expenses/export?clientId=${client.id}`}
              className="button-secondary"
            >
              {t("exportCsv")}
            </a>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="expense-summary-heading">
          <h2 id="expense-summary-heading" className="sr-only">
            {t("summaryTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("totalCount"), value: counts.total },
              { label: t("pendingCount"), value: counts.pending },
              { label: t("approvedCount"), value: counts.approved },
              { label: t("rejectedCount"), value: counts.rejected },
            ].map((summary) => (
              <article key={summary.label} className="card-base p-5">
                <p className="text-sm text-slate">{summary.label}</p>
                <p className="display-font mt-2 text-3xl text-ink">
                  {summary.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <ClientExpenseAnalytics expenses={analyticsExpenses} locale={locale} />

        <nav
          className="mt-8 flex flex-col gap-3 border-b border-hairline-soft pb-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label={t("statusFilterLabel")}
        >
          <p className="field-label">{t("statusFilterLabel")}</p>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Link
                key={option.value}
                href={`/admin/clients/${client.id}/expenses?status=${option.value}`}
                className={
                  statusFilter === option.value
                    ? "button-primary min-h-10 px-3 py-2"
                    : "button-secondary min-h-10 px-3 py-2"
                }
                aria-current={
                  statusFilter === option.value ? "page" : undefined
                }
              >
                {option.label}
              </Link>
            ))}
          </div>
        </nav>

        <section className="mt-10" aria-labelledby="pending-heading">
          <div className="flex flex-col gap-2 border-b border-hairline-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="badge-orange">01</span>
                <h2
                  id="pending-heading"
                  className="text-2xl font-medium text-ink"
                >
                  {t("pendingTitle")}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate">
                {t("pendingIntro")}
              </p>
            </div>
            <span className="text-sm text-steel">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">
                {statusFilter === "ALL"
                  ? t("pendingEmpty")
                  : t("filteredEmpty")}
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-4" aria-label={t("pendingTitle")}>
              {pending.map((expense) => {
                const confidence = expense.classificationConfidence;
                const hasClassification = confidence != null;
                const lowConfidence =
                  hasClassification && confidence < LOW_CONFIDENCE_THRESHOLD;
                return (
                  <li key={expense.id} className="card-feature p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row">
                      {expense.receipt && (
                        <div className="relative h-36 w-full flex-shrink-0 overflow-hidden rounded-lg bg-surface sm:h-24 sm:w-24">
                          <Image
                            src={expense.receipt}
                            alt={t("receiptAlt", {
                              description: expense.description,
                            })}
                            fill
                            className=" object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-ink">
                            {expense.description}
                          </h3>
                          <span className="status-badge status-pending">
                            {t("statusPending")}
                          </span>
                          {lowConfidence && (
                            <span className="confidence-badge confidence-low">
                              {t("reviewCarefully")}
                            </span>
                          )}
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm text-slate sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="text-steel">{t("dateLabel")}</dt>
                            <dd className="mt-1 text-ink">
                              {dateFormatter.format(expense.date)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-steel">{t("categoryLabel")}</dt>
                            <dd className="mt-1 text-ink">
                              {expense.category.name}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-steel">{t("amountLabel")}</dt>
                            <dd className="mt-1 text-ink">
                              {numberFormatter.format(expense.amount)}{" "}
                              {expense.currency}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-steel">
                              {t("confidenceLabel")}
                            </dt>
                            <dd className="mt-1 text-ink">
                              {hasClassification
                                ? `${Math.round(confidence * 100)}%`
                                : t("confidenceNotAvailable")}
                            </dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-sm text-steel">
                          {t("btwLabel")} {expense.btwRate}% ·{" "}
                          {expense.deductible
                            ? t("deductible")
                            : t("notDeductible")}
                        </p>
                      </div>
                    </div>
                    <ReviewActions expenseId={expense.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-14" aria-labelledby="reviewed-heading">
          <div className="flex flex-col gap-2 border-b border-hairline-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="badge-dark">02</span>
                <h2
                  id="reviewed-heading"
                  className="text-2xl font-medium text-ink"
                >
                  {t("reviewedTitle")}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate">
                {t("reviewedIntro")}
              </p>
            </div>
            <span className="text-sm text-steel">{reviewed.length}</span>
          </div>
          {reviewed.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">
                {statusFilter === "ALL"
                  ? t("reviewedEmpty")
                  : t("filteredEmpty")}
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3" aria-label={t("reviewedTitle")}>
              {reviewed.map((expense) => {
                const confidence = expense.classificationConfidence;
                const hasClassification = confidence != null;
                return (
                  <li key={expense.id} className="card-base p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-ink">
                            {expense.description}
                          </h3>
                          <span
                            className={
                              expense.status === "APPROVED"
                                ? "status-badge status-approved"
                                : "status-badge status-rejected"
                            }
                          >
                            {expense.status === "APPROVED"
                              ? t("statusApproved")
                              : t("statusRejected")}
                          </span>
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm text-slate sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="text-steel">{t("dateLabel")}</dt>
                            <dd className="mt-1 text-ink">
                              {dateFormatter.format(expense.date)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-steel">{t("categoryLabel")}</dt>
                            <dd className="mt-1 text-ink">
                              {expense.category.name}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-steel">{t("amountLabel")}</dt>
                            <dd className="mt-1 text-ink">
                              {numberFormatter.format(expense.amount)}{" "}
                              {expense.currency}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-steel">
                              {t("confidenceLabel")}
                            </dt>
                            <dd className="mt-1 text-ink">
                              {hasClassification
                                ? `${Math.round(confidence * 100)}%`
                                : t("confidenceNotAvailable")}
                            </dd>
                          </div>
                        </dl>
                        {expense.reviewNote && (
                          <p className="mt-3 text-sm text-slate">
                            {t("noteLabel")}: {expense.reviewNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
