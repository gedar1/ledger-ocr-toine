"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  const t = useTranslations("Common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="state-page" role="alert">
      <div className="state-card">
        <span className="state-kicker">Libro Mayor_</span>
        <div className="state-icon state-icon-error" aria-hidden="true">
          !
        </div>
        <h1 className="display-font mt-6 text-3xl text-ink">
          {t("errorTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate">{t("errorBody")}</p>
        <button type="button" onClick={retry} className="button-primary mt-6">
          {t("retry")}
        </button>
      </div>
    </main>
  );
}
