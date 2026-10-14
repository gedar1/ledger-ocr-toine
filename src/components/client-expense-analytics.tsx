import { getTranslations } from "next-intl/server";

export type ClientExpenseAnalyticsExpense = {
  amount: number;
  date: Date;
  currency: string;
  categoryId: string;
  category: { name: string };
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type MonthlySpending = {
  monthStart: Date;
  label: string;
  amount: number;
};

type CategorySpending = {
  categoryId: string;
  name: string;
  amount: number;
  count: number;
  percentage: number;
};

type ClientExpenseAnalyticsProps = {
  expenses: ClientExpenseAnalyticsExpense[];
  locale: string;
};

export async function ClientExpenseAnalytics({
  expenses,
  locale,
}: ClientExpenseAnalyticsProps) {
  const t = await getTranslations("ReviewPanel");
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
  const periodExpenses = expenses.filter(
    (expense) => expense.date >= analyticsStart && expense.date < analyticsEnd,
  );
  const analyticsCurrency = periodExpenses[0]?.currency ?? "EUR";
  const compatibleExpenses = periodExpenses.filter(
    (expense) => expense.currency === analyticsCurrency,
  );
  const hasAnalyticsData = compatibleExpenses.length > 0;
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
      const amount = compatibleExpenses
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
  const categoryAggregates = Array.from(
    compatibleExpenses
      .reduce((aggregates, expense) => {
        const aggregate = aggregates.get(expense.categoryId);
        if (aggregate) {
          aggregate.amount += expense.amount;
          aggregate.count += 1;
        } else {
          aggregates.set(expense.categoryId, {
            categoryId: expense.categoryId,
            name: expense.category.name,
            amount: expense.amount,
            count: 1,
          });
        }
        return aggregates;
      }, new Map<string, Omit<CategorySpending, "percentage">>())
      .values(),
  ).sort((a, b) => b.amount - a.amount);
  const categoryTotal = categoryAggregates.reduce(
    (total, category) => total + category.amount,
    0,
  );
  const categorySpending: CategorySpending[] = categoryAggregates.map(
    (category) => ({
      ...category,
      percentage:
        categoryTotal > 0 ? (category.amount / categoryTotal) * 100 : 0,
    }),
  );
  const periodCounts = periodExpenses.reduce(
    (summary, expense) => {
      summary.total += 1;
      if (expense.status === "PENDING") summary.pending += 1;
      if (expense.status === "APPROVED") summary.approved += 1;
      if (expense.status === "REJECTED") summary.rejected += 1;
      return summary;
    },
    { total: 0, pending: 0, approved: 0, rejected: 0 },
  );
  const periodTotal = compatibleExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
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
    <section className="mt-14" aria-labelledby="client-analytics-heading">
      <div className="flex flex-col gap-2 border-b border-hairline-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="client-analytics-heading"
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
        <>
          <div className="mt-5">
            <h3 className="text-xl font-medium text-ink">
              {t("analyticsSummaryTitle")}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <article className="card-base p-5">
                <p className="text-sm text-slate">
                  {t("analyticsTotalAmount")}
                </p>
                <p className="display-font mt-2 text-2xl text-ink">
                  {analyticsNumberFormatter.format(periodTotal)}
                </p>
              </article>
              <article className="card-base p-5">
                <p className="text-sm text-slate">
                  {t("analyticsExpenseCount")}
                </p>
                <p className="display-font mt-2 text-3xl text-ink">
                  {periodCounts.total}
                </p>
              </article>
              <article className="card-base p-5">
                <p className="text-sm text-slate">
                  {t("analyticsPendingCount")}
                </p>
                <p className="display-font mt-2 text-3xl text-ink">
                  {periodCounts.pending}
                </p>
              </article>
              <article className="card-base p-5">
                <p className="text-sm text-slate">
                  {t("analyticsApprovedCount")}
                </p>
                <p className="display-font mt-2 text-3xl text-ink">
                  {periodCounts.approved}
                </p>
              </article>
              <article className="card-base p-5">
                <p className="text-sm text-slate">
                  {t("analyticsRejectedCount")}
                </p>
                <p className="display-font mt-2 text-3xl text-ink">
                  {periodCounts.rejected}
                </p>
              </article>
            </div>
          </div>
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
                  aria-labelledby="client-monthly-chart-title client-monthly-chart-description"
                >
                  <title id="client-monthly-chart-title">
                    {t("monthlySpendingTitle")}
                  </title>
                  <desc id="client-monthly-chart-description">
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
                    <span>
                      {t("analyticsMonthLabel")}: {month.label}
                    </span>
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
                <p className="mt-5 text-sm text-slate">{t("analyticsEmpty")}</p>
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
        </>
      )}
    </section>
  );
}
