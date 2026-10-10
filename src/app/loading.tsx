import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <main className="state-page" aria-busy="true" aria-live="polite">
      <div className="state-card">
        <span className="state-kicker">Libro Mayor_</span>
        <div className="loading-mark" aria-hidden="true" />
        <h1 className="display-font mt-6 text-3xl text-ink">{t("loadingTitle")}</h1>
        <p className="mt-2 text-sm text-slate">{t("loadingBody")}</p>
      </div>
    </main>
  );
}
