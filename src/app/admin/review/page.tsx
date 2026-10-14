import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

const pendingExpenseSelect = {
  id: true,
  clientId: true,
  description: true,
  amount: true,
  currency: true,
  date: true,
  classificationConfidence: true,
  client: {
    select: {
      businessName: true,
    },
  },
} satisfies Prisma.ExpenseSelect;

type PendingExpense = Prisma.ExpenseGetPayload<{
  select: typeof pendingExpenseSelect;
}>;

export default async function AdminReviewPage() {
  const session = await auth();
  if (session?.user.role !== "ACCOUNTANT") notFound();

  const t = await getTranslations("AdminReview");
  const locale = await getLocale();
  const pendingExpenses = await prisma.expense.findMany({
    where: {
      status: "PENDING",
      client: { accountantId: session.user.id },
    },
    select: pendingExpenseSelect,
    orderBy: { date: "asc" },
  });
  const prioritizedExpenses = [...pendingExpenses].sort(
    (a: PendingExpense, b: PendingExpense) => {
      const confidenceDifference =
        (a.classificationConfidence ?? 0) - (b.classificationConfidence ?? 0);
      return confidenceDifference !== 0
        ? confidenceDifference
        : a.date.getTime() - b.date.getTime();
    },
  );
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });
  const numberFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-12">
        <p className="eyebrow">{t("eyebrow")}</p>
        <section className="mt-10" aria-labelledby="pending-heading">
          <div className="flex flex-col gap-2 border-b border-hairline-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
            {/* <div>
              <h2
                id="pending-heading"
                className="text-2xl font-medium text-ink"
              >
                {t("pendingTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate">
                {t("pendingIntro")}
              </p>
            </div> */}
            <span className="text-sm text-steel">
              {t("pendingCount", { count: pendingExpenses.length })}
            </span>
          </div>

          {prioritizedExpenses.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("empty")}</p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-4" aria-label={t("pendingTitle")}>
              {prioritizedExpenses.map((expense) => {
                const confidence = expense.classificationConfidence;
                const lowConfidence =
                  confidence != null && confidence < LOW_CONFIDENCE_THRESHOLD;

                return (
                  <li key={expense.id} className="card-feature p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-ink">
                            {expense.client.businessName}
                          </h3>
                          <span className="status-badge status-pending">
                            {t("pendingStatus")}
                          </span>
                          {lowConfidence && (
                            <span className="confidence-badge confidence-low">
                              {t("lowConfidence")}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-ink-tint">
                          {expense.description}
                        </p>
                        <dl className="mt-3 grid gap-1 text-sm text-slate sm:grid-cols-3 sm:gap-3">
                          <div>
                            <dt className="inline font-medium text-steel">
                              {t("amountLabel")}:{" "}
                            </dt>
                            <dd className="inline">
                              {numberFormatter.format(expense.amount)}{" "}
                              {expense.currency}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-medium text-steel">
                              {t("dateLabel")}:{" "}
                            </dt>
                            <dd className="inline">
                              {dateFormatter.format(expense.date)}
                            </dd>
                          </div>
                          <div>
                            <dt className="inline font-medium text-steel">
                              {t("confidenceLabel")}:{" "}
                            </dt>
                            <dd className="inline">
                              {confidence == null
                                ? t("confidenceNotAvailable")
                                : `${Math.round(confidence * 100)}%`}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <Link
                        href={`/admin/clients/${expense.clientId}/expenses`}
                        className="button-secondary self-start sm:self-auto"
                        aria-label={t("reviewClientFor", {
                          businessName: expense.client.businessName,
                        })}
                      >
                        {t("reviewClient")}
                      </Link>
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
