import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const MAX_PENDING_EXPENSES = 8;

const pendingExpenseSelect = {
  id: true,
  clientId: true,
  description: true,
  amount: true,
  currency: true,
  date: true,
  classificationConfidence: true,
  status: true,
  client: {
    select: {
      businessName: true,
    },
  },
} satisfies Prisma.ExpenseSelect;

const analyticsExpenseSelect = {
  amount: true,
  date: true,
  currency: true,
  categoryId: true,
} satisfies Prisma.ExpenseSelect;

type PendingExpense = Prisma.ExpenseGetPayload<{
  select: typeof pendingExpenseSelect;
}>;
type AnalyticsExpense = Prisma.ExpenseGetPayload<{
  select: typeof analyticsExpenseSelect;
}>;
type MonthlySpending = {
  monthStart: Date;
  label: string;
  amount: number;
};
type CategoryAggregate = {
  categoryId: string;
  amount: number;
  count: number;
};
type CategorySpending = CategoryAggregate & {
  name: string;
  percentage: number;
};

export default async function AdminHomePage() {
  const session = await auth();
  if (session?.user?.role !== "ACCOUNTANT") notFound();

  const t = await getTranslations("AdminHome");
  const locale = await getLocale();
  const accountantId = session.user.id;
  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const analyticsStart = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() - 5,
      1,
    ),
  );
  const analyticsEnd = new Date(
    Date.UTC(
      currentMonthStart.getUTCFullYear(),
      currentMonthStart.getUTCMonth() + 1,
      1,
    ),
  );

  const [
    totalClients,
    activeClients,
    invitedClients,
    pendingExpensesCount,
    pendingExpenses,
    analyticsExpenses,
    categoryGroups,
    analyticsCategories,
  ] = await Promise.all([
    prisma.clientProfile.count({ where: { accountantId } }),
    prisma.clientProfile.count({ where: { accountantId, status: "ACTIVE" } }),
    prisma.clientProfile.count({ where: { accountantId, status: "INVITED" } }),
    prisma.expense.count({
      where: { status: "PENDING", client: { accountantId } },
    }),
    prisma.expense.findMany({
      where: { status: "PENDING", client: { accountantId } },
      select: pendingExpenseSelect,
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        client: { accountantId },
        date: { gte: analyticsStart, lt: analyticsEnd },
      },
      select: analyticsExpenseSelect,
      orderBy: { date: "asc" },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        client: { accountantId },
        category: { accountantId },
        date: { gte: analyticsStart, lt: analyticsEnd },
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.category.findMany({
      where: { accountantId },
      select: { id: true, name: true },
    }),
  ]);

  const prioritizedPendingExpenses = [...pendingExpenses]
    .sort((a: PendingExpense, b: PendingExpense) => {
      const confidenceDifference =
        (a.classificationConfidence ?? 0) - (b.classificationConfidence ?? 0);
      return confidenceDifference !== 0
        ? confidenceDifference
        : a.date.getTime() - b.date.getTime();
    })
    .slice(0, MAX_PENDING_EXPENSES);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });
  const numberFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const analyticsCurrency = analyticsExpenses[0]?.currency ?? "EUR";
  const analyticsCurrencies = new Set(
    analyticsExpenses.map((expense) => expense.currency),
  );
  const compatibleAnalyticsExpenses: AnalyticsExpense[] =
    analyticsExpenses.filter(
      (expense) => expense.currency === analyticsCurrency,
    );
  const analyticsNumberFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: analyticsCurrency,
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });
  const monthlySpending: MonthlySpending[] = Array.from(
    { length: 6 },
    (_, index) => {
      const monthStart = new Date(
        Date.UTC(
          analyticsStart.getUTCFullYear(),
          analyticsStart.getUTCMonth() + index,
          1,
        ),
      );
      const amount = compatibleAnalyticsExpenses
        .filter(
          (expense) =>
            expense.date.getUTCFullYear() === monthStart.getUTCFullYear() &&
            expense.date.getUTCMonth() === monthStart.getUTCMonth(),
        )
        .reduce((total, expense) => total + expense.amount, 0);

      return {
        monthStart,
        label: monthFormatter.format(monthStart),
        amount,
      };
    },
  );
  const categoriesById = new Map(
    analyticsCategories.map((category) => [category.id, category.name]),
  );
  const categoryAggregates: CategoryAggregate[] =
    analyticsCurrencies.size <= 1
      ? categoryGroups.map((group) => ({
          categoryId: group.categoryId,
          amount: group._sum.amount ?? 0,
          count: group._count._all,
        }))
      : Array.from(
          compatibleAnalyticsExpenses
            .reduce((aggregates, expense) => {
              const aggregate = aggregates.get(expense.categoryId);
              if (aggregate) {
                aggregate.amount += expense.amount;
                aggregate.count += 1;
              } else {
                aggregates.set(expense.categoryId, {
                  categoryId: expense.categoryId,
                  amount: expense.amount,
                  count: 1,
                });
              }
              return aggregates;
            }, new Map<string, CategoryAggregate>())
            .values(),
        ).sort((a, b) => b.amount - a.amount);
  const namedCategoryAggregates = categoryAggregates.flatMap((aggregate) => {
    const name = categoriesById.get(aggregate.categoryId);
    return name ? [{ ...aggregate, name }] : [];
  });
  const categoryTotal = namedCategoryAggregates.reduce(
    (total, category) => total + category.amount,
    0,
  );
  const categorySpending: CategorySpending[] = namedCategoryAggregates.map(
    (category) => ({
      ...category,
      percentage:
        categoryTotal > 0 ? (category.amount / categoryTotal) * 100 : 0,
    }),
  );
  const hasAnalyticsData = compatibleAnalyticsExpenses.length > 0;
  const chartWidth = 720;
  const chartHeight = 280;
  const chartPadding = { top: 24, right: 24, bottom: 48, left: 64 };
  const chartMaxAmount = Math.max(
    ...monthlySpending.map((month) => month.amount),
    1,
  );
  const chartPlotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartPlotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const monthlyPoints = monthlySpending.map((month, index) => ({
    ...month,
    x:
      chartPadding.left +
      (index / (monthlySpending.length - 1)) * chartPlotWidth,
    y: chartPadding.top + (1 - month.amount / chartMaxAmount) * chartPlotHeight,
  }));
  const chartPointsAttribute = monthlyPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const categoryBarTones = [
    "admin-category-bar-tone-primary",
    "admin-category-bar-tone-sunshine",
    "admin-category-bar-tone-yellow",
    "admin-category-bar-tone-deep",
  ];

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-12">
        <p className="eyebrow">{t("eyebrow")}</p>
        <section className="mt-5" aria-labelledby="summary-heading">
          <h5 id="summary-heading" className="text-xl font-medium text-ink">
            {t("summaryTitle")}
          </h5>
          <div className="mt-3 flex gap-6 h-20 w-fit">
            <article className="card-base flex items-center gap-4 p-5 sm:p-4">
              <p className="text-sm text-slate ">{t("totalClients")}</p>
              <p className="display-font  text-3xl text-ink">{totalClients}</p>
            </article>
            <article className="card-base  flex items-center gap-4  p-5 sm:p-4">
              <p className="text-sm text-slate">{t("clientStatuses")}</p>
              <dl className=" flex  gap-4">
                <div className="flex flex-col items-center justify-center">
                  <dt className="text-sm text-steel">{t("activeClients")}</dt>
                  <dd className="display-font  text-3xl text-ink">
                    {activeClients}
                  </dd>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <dt className="text-sm text-steel">{t("invitedClients")}</dt>
                  <dd className="display-font text-3xl text-ink">
                    {invitedClients}
                  </dd>
                </div>
              </dl>
            </article>
            <article className="card-base flex items-center gap-4  p-5 sm:p-4">
              <p className="text-sm text-slate">{t("pendingExpenses")}</p>
              <p className="display-font text-3xl text-ink">
                {pendingExpensesCount}
              </p>
            </article>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="analytics-heading">
          <div className="flex flex-col gap-2 border-b border-hairline-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="analytics-heading"
                className="text-2xl font-medium text-ink"
              >
                {t("analyticsTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">
                {t("analyticsIntro")}
              </p>
            </div>
            <span className="text-sm text-steel">{t("analyticsPeriod")}</span>
          </div>
          {!hasAnalyticsData ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("analyticsEmpty")}</p>
            </div>
          ) : (
            <div className="admin-analytics-grid mt-5">
              <article className="card-feature admin-analytics-card p-5 sm:p-6">
                <h3 className="text-xl font-medium text-ink">
                  {t("monthlySpendingTitle")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate">
                  {t("monthlySpendingDescription")}
                </p>
                <div className="admin-chart-shell mt-5">
                  <svg
                    className="admin-chart-svg"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    role="img"
                    aria-labelledby="monthly-chart-title monthly-chart-description"
                  >
                    <title id="monthly-chart-title">
                      {t("monthlySpendingTitle")}
                    </title>
                    <desc id="monthly-chart-description">
                      {t("monthlySpendingDescription")}
                    </desc>
                    {[chartMaxAmount, chartMaxAmount / 2, 0].map(
                      (guideAmount) => {
                        const y =
                          chartPadding.top +
                          (1 - guideAmount / chartMaxAmount) * chartPlotHeight;
                        return (
                          <g key={guideAmount}>
                            <line
                              className="admin-chart-grid-line"
                              x1={chartPadding.left}
                              x2={chartWidth - chartPadding.right}
                              y1={y}
                              y2={y}
                            />
                            <text
                              className="admin-chart-label"
                              x={chartPadding.left - 8}
                              y={y + 4}
                              textAnchor="end"
                            >
                              {analyticsNumberFormatter.format(guideAmount)}
                            </text>
                          </g>
                        );
                      },
                    )}
                    <line
                      className="admin-chart-axis"
                      x1={chartPadding.left}
                      x2={chartPadding.left}
                      y1={chartPadding.top}
                      y2={chartHeight - chartPadding.bottom}
                    />
                    <line
                      className="admin-chart-axis"
                      x1={chartPadding.left}
                      x2={chartWidth - chartPadding.right}
                      y1={chartHeight - chartPadding.bottom}
                      y2={chartHeight - chartPadding.bottom}
                    />
                    <polyline
                      className="admin-chart-line"
                      fill="none"
                      points={chartPointsAttribute}
                    />
                    {monthlyPoints.map((point) => (
                      <g key={point.monthStart.toISOString()}>
                        <circle
                          className="admin-chart-point"
                          cx={point.x}
                          cy={point.y}
                          r="5"
                        />
                        <text
                          className="admin-chart-value"
                          x={point.x}
                          y={point.y - 12}
                          textAnchor="middle"
                        >
                          {analyticsNumberFormatter.format(point.amount)}
                        </text>
                        <text
                          className="admin-chart-label"
                          x={point.x}
                          y={chartHeight - chartPadding.bottom + 24}
                          textAnchor="middle"
                        >
                          {point.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <ol
                  className="admin-chart-data-list mt-4"
                  aria-label={t("monthlySpendingAriaLabel")}
                >
                  {monthlySpending.map((month) => (
                    <li
                      key={month.monthStart.toISOString()}
                      className="admin-chart-data-item"
                    >
                      <span>{month.label}</span>
                      <strong className="font-medium text-ink">
                        {analyticsNumberFormatter.format(month.amount)}
                      </strong>
                    </li>
                  ))}
                </ol>
              </article>

              <article className="card-feature admin-analytics-card p-5 sm:p-6">
                <h3 className="text-xl font-medium text-ink">
                  {t("categorySpendingTitle")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate">
                  {t("categorySpendingDescription")}
                </p>
                {categorySpending.length === 0 ? (
                  <p className="mt-5 text-sm text-slate">
                    {t("analyticsEmpty")}
                  </p>
                ) : (
                  <ol
                    className="mt-5 space-y-5"
                    aria-label={t("categorySpendingAriaLabel")}
                  >
                    {categorySpending.map((category, index) => {
                      const formattedAmount = analyticsNumberFormatter.format(
                        category.amount,
                      );
                      const roundedPercentage = Math.round(category.percentage);
                      return (
                        <li key={category.categoryId}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-medium text-ink">
                                <span className="mr-2 text-steel">
                                  {index + 1}.
                                </span>
                                {category.name}
                              </p>
                              <p className="mt-1 text-sm text-slate">
                                {category.count} {t("analyticsExpenseCount")}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-medium text-ink">
                                {formattedAmount}
                              </p>
                              <p className="mt-1 text-sm text-slate">
                                {roundedPercentage}%
                              </p>
                            </div>
                          </div>
                          <div
                            className="admin-category-bar-track mt-3"
                            role="meter"
                            aria-valuenow={category.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${t("analyticsCategoryLabel")}: ${category.name}; ${t("analyticsAmountLabel")}: ${formattedAmount}; ${roundedPercentage}%`}
                          >
                            <div
                              className={`admin-category-bar ${categoryBarTones[index % categoryBarTones.length]}`}
                              style={{
                                width: `${Math.min(category.percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </article>
            </div>
          )}
        </section>

        <section className="mt-14" aria-labelledby="pending-heading">
          <div className="flex flex-col gap-2 border-b border-hairline-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="pending-heading"
                className="text-2xl font-medium text-ink"
              >
                {t("pendingSectionTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate">
                {t("pendingSectionIntro")}
              </p>
            </div>
            <span className="text-sm text-steel">{pendingExpensesCount}</span>
          </div>
          {prioritizedPendingExpenses.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("pendingEmpty")}</p>
            </div>
          ) : (
            <ul
              className="mt-5 grid gap-4"
              aria-label={t("pendingSectionTitle")}
            >
              {prioritizedPendingExpenses.map((expense) => {
                const confidence = expense.classificationConfidence;
                const hasClassification = confidence != null;
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
                              {t("clientLabel")}:{" "}
                            </dt>
                            <dd className="inline">
                              {expense.client.businessName}
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
                          {hasClassification && (
                            <div>
                              <dt className="inline font-medium text-steel">
                                {t("confidenceLabel")}:{" "}
                              </dt>
                              <dd className="inline">
                                {Math.round(confidence * 100)}%
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        <p className="text-lg font-medium text-ink">
                          {numberFormatter.format(expense.amount)}{" "}
                          {expense.currency}
                        </p>
                        <Link
                          href={`/admin/clients/${expense.clientId}/expenses`}
                          className="button-secondary"
                          aria-label={t("reviewExpenseFor", {
                            businessName: expense.client.businessName,
                          })}
                        >
                          {t("reviewExpense")}
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* <div className="mt-14 grid gap-5 md:grid-cols-2">
          <Link
            href="/admin/clients"
            className="card-feature group flex min-h-52 flex-col justify-between"
          >
            <div>
              <span className="badge-orange">01</span>
              <h2 className="mt-5 text-2xl font-medium text-ink">
                {t("clients")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate">
                {t("clientsBody")}
              </p>
            </div>
            <span className="mt-6 text-sm font-medium text-primary-deep">
              {t("open")} ↗
            </span>
          </Link>
          <Link
            href="/admin/categories"
            className="card-cream group flex min-h-52 flex-col justify-between"
          >
            <div>
              <span className="badge-dark">02</span>
              <h2 className="mt-5 text-2xl font-medium text-ink">
                {t("categories")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-tint">
                {t("categoriesBody")}
              </p>
            </div>
            <span className="mt-6 text-sm font-medium text-primary-deep">
              {t("open")} ↗
            </span>
          </Link>
        </div> */}
      </div>
    </main>
  );
}
