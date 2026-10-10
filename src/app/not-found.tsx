import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("Common");

  return (
    <main className="state-page" role="status">
      <div className="state-card">
        <span className="state-kicker">404 / Libro Mayor_</span>
        <div className="state-icon state-icon-not-found" aria-hidden="true">404</div>
        <h1 className="display-font mt-6 text-3xl text-ink">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate">{t("notFoundBody")}</p>
        <Link href="/" className="button-dark mt-6">{t("backHome")}</Link>
      </div>
    </main>
  );
}
