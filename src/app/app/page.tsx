import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function ClientHomePage() {
  const t = await getTranslations("ClientHome");

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
        <p className="eyebrow">{t("eyebrow")}</p>
        <div className="mt-4 max-w-3xl">
          <h1 className="display-font text-5xl leading-tight tracking-tight text-ink sm:text-6xl">
            {t("welcome")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate">
            {t("intro")}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            href="/app/expenses"
            className="card-feature group flex min-h-48 flex-col justify-between"
          >
            <div>
              <span className="badge-cream">{t("expensesBadge")}</span>
              <h2 className="mt-5 text-2xl font-medium text-ink">
                {t("myExpenses")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate">
                {t("summary")}
              </p>
            </div>
            <span className="mt-6 text-sm font-medium text-primary-deep">
              {t("myExpenses")} ↗
            </span>
          </Link>
          <Link
            href="/app/expenses/scan"
            className="card-cream group flex min-h-48 flex-col justify-between"
          >
            <div>
              <span className="badge-dark">OCR</span>
              <h2 className="mt-5 text-2xl font-medium text-ink">
                {t("scanReceipt")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-tint">
                {t("intro")}
              </p>
            </div>
            <span className="mt-6 text-sm font-medium text-primary-deep">
              {t("scanReceipt")} ↗
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
