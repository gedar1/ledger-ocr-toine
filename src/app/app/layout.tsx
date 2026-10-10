import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/section-header";
import { SectionNavLink } from "@/components/section-nav-link";

export default async function ClientSectionLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const t = await getTranslations("ClientExpenses");

  return (
    <div className="flex flex-1 flex-col">
      <SectionHeader>
        <SectionNavLink href="/app" exact className="section-nav-brand">
          Libro Mayor
        </SectionNavLink>
        <SectionNavLink href="/app/expenses">{t("title")}</SectionNavLink>
      </SectionHeader>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
