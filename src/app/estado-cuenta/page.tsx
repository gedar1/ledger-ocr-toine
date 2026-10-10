import { getTranslations } from "next-intl/server";

/**
 * Destination for CLIENT sessions whose ClientProfile.status isn't ACTIVE
 * yet (INVITED/SUSPENDED) — src/proxy.ts redirects any /app/* request from
 * such a session here instead of letting it through. Static/informational
 * only: no actions, no data fetching beyond the translated copy.
 */
export default async function AccountStatusPage() {
  const t = await getTranslations("AccountStatus");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("body")}</p>
      </div>
    </div>
  );
}
