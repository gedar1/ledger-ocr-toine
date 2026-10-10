/**
 * Locale constants shared between server-only code (src/i18n/request.ts,
 * which reads cookies()/auth()) and client components (e.g. the language
 * selector). Kept in its own module, free of server-only imports, so
 * Client Components can import it directly without pulling in
 * 'next/headers'/'@/auth'.
 */
export const SUPPORTED_LOCALES = ["es", "nl", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isSupportedLocale(
  value: string | undefined | null,
): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
