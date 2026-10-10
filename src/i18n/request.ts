import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { auth } from "@/auth";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isSupportedLocale,
  type SupportedLocale,
} from "./locales";

/**
 * This app doesn't use next-intl's prefix-based [locale] routing (it has
 * role-based /admin and /app paths instead, per context.json's decision),
 * so the active locale is resolved here rather than from the URL segment:
 * 1. The NEXT_LOCALE cookie, if present and one of es/nl/en.
 * 2. The signed-in user's User.locale (accountant default 'nl', client
 *    default 'es', set at user-creation time in FEAT-001/002).
 * 3. DEFAULT_LOCALE ('es') as the final fallback — e.g. an unauthenticated
 *    visit to /login with no NEXT_LOCALE cookie, which must render Spanish
 *    per this FEAT's acceptance criteria.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: SupportedLocale;
  if (isSupportedLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const session = await auth();
    const userLocale = session?.user?.locale;
    locale = isSupportedLocale(userLocale) ? userLocale : DEFAULT_LOCALE;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
