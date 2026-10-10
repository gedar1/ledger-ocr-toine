"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from "@/i18n/locales";

/**
 * Sets the NEXT_LOCALE cookie (read by src/i18n/request.ts on the next
 * request) and refreshes the current route so Server Components re-render
 * with the new locale's messages.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("LocaleSwitcher");

  function handleChange(next: string) {
    if (!isSupportedLocale(next)) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <label className="locale-switcher text-xs text-slate">
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={t("label")}
        className="locale-select text-sm"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
