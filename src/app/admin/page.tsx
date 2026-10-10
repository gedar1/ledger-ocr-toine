import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AdminHomePage() {
  const t = await getTranslations("AdminHome");

  return (
    <main className="flex-1 bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
        <p className="eyebrow">{t("eyebrow")}</p>
        <div className="mt-4 max-w-3xl">
          <h1 className="display-font text-5xl leading-tight tracking-tight text-ink sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate">
            {t("intro")}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
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
        </div>
      </div>
    </main>
  );
}
