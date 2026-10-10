import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";

/**
 * Shared top bar for the /admin and /app sections: section-specific nav
 * links (passed as children) plus the language selector that sets the
 * NEXT_LOCALE cookie (FEAT-005's locale-switching requirement).
 */
export async function SectionHeader({ children }: { children: ReactNode }) {
  const t = await getTranslations("Common");

  return (
    <header className="site-header">
      <div className="section-nav">
        <nav aria-label={t("mainNavigation")} className="section-nav-links">
          {children}
        </nav>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
