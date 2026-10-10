import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("SiteFooter");

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <p className="display-font text-2xl text-ink">Libro Mayor_</p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate">{t("tagline")}</p>
        </div>
        <div>
          <p className="footer-heading">{t("workspace")}</p>
          <nav aria-label={t("workspace")} className="mt-3 flex flex-col gap-2">
            <Link href="/admin" className="footer-link">{t("admin")}</Link>
            <Link href="/admin/clients" className="footer-link">{t("clients")}</Link>
            <Link href="/app/expenses" className="footer-link">{t("expenses")}</Link>
          </nav>
        </div>
        <div>
          <p className="footer-heading">{t("settings")}</p>
          <nav aria-label={t("settings")} className="mt-3 flex flex-col gap-2">
            <Link href="/admin/categories" className="footer-link">{t("categories")}</Link>
            <Link href="/login" className="footer-link">{t("signIn")}</Link>
          </nav>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>{t("copyright")}</span>
        <span>{t("madeFor")}</span>
      </div>
    </footer>
  );
}
