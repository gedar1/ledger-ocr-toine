import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewActions } from "./review-actions";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

export default async function ClientExpensesReviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ACCOUNTANT") notFound();
  const t = await getTranslations("ReviewPanel");
  const { clientId } = await params;
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
  const pending = expenses
    .filter((expense) => expense.status === "PENDING")
    .sort(
      (a, b) =>
        (a.classificationConfidence ?? 0) - (b.classificationConfidence ?? 0),
    );
  const reviewed = expenses.filter((expense) => expense.status !== "PENDING");

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="flex flex-col gap-6 border-b border-hairline-soft pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="display-font mt-3 text-4xl text-ink sm:text-5xl">
              {t("expensesFor", { businessName: client.businessName })}
            </h1>
            <p className="mt-3 text-sm text-slate">{client.user.email}</p>
          </div>
          <a
            href={`/api/expenses/export?clientId=${client.id}`}
            className="button-secondary self-start"
          >
            {t("exportCsv")}
          </a>
        </div>

        <section className="mt-10" aria-labelledby="pending-heading">
          <div className="flex items-end justify-between border-b border-hairline-soft pb-4">
            <div>
              <span className="badge-orange">01</span>
              <h2
                id="pending-heading"
                className="mt-4 text-2xl font-medium text-ink"
              >
                {t("pendingTitle")}
              </h2>
            </div>
            <span className="text-sm text-steel">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("pendingEmpty")}</p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-4" aria-label={t("pendingTitle")}>
              {pending.map((expense) => {
                const hasClassification =
                  expense.classificationConfidence != null;
                const lowConfidence =
                  hasClassification &&
                  expense.classificationConfidence! < LOW_CONFIDENCE_THRESHOLD;
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
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-ink">
                            {expense.description}
                          </h3>
                          {lowConfidence && (
                            <span className="status-badge status-pending">
                              {t("reviewCarefully")}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate">
                          {expense.category.name} · {expense.amount.toFixed(2)}{" "}
                          {expense.currency} ·{" "}
                          {new Date(expense.date).toLocaleDateString("es-ES")} ·
                          BTW {expense.btwRate}% ·{" "}
                          {expense.deductible
                            ? t("deductible")
                            : t("notDeductible")}
                        </p>
                        {hasClassification && (
                          <p className="mt-2 text-sm text-steel">
                            {t("classificationConfidence")}:{" "}
                            {Math.round(
                              expense.classificationConfidence! * 100,
                            )}
                            %
                          </p>
                        )}
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
          <div className="flex items-end justify-between border-b border-hairline-soft pb-4">
            <div>
              <span className="badge-dark">02</span>
              <h2
                id="reviewed-heading"
                className="mt-4 text-2xl font-medium text-ink"
              >
                {t("reviewedTitle")}
              </h2>
            </div>
            <span className="text-sm text-steel">{reviewed.length}</span>
          </div>
          {reviewed.length === 0 ? (
            <div className="empty-state mt-5">
              <p className="text-sm text-slate">{t("reviewedEmpty")}</p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3" aria-label={t("reviewedTitle")}>
              {reviewed.map((expense) => (
                <li
                  key={expense.id}
                  className="card-base flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-medium text-ink">
                      {expense.description}
                    </p>
                    <p className="mt-1 text-sm text-slate">
                      {expense.category.name} · {expense.amount.toFixed(2)}{" "}
                      {expense.currency}
                    </p>
                    {expense.reviewNote && (
                      <p className="mt-2 text-sm text-slate">
                        {t("noteLabel")}: {expense.reviewNote}
                      </p>
                    )}
                  </div>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
