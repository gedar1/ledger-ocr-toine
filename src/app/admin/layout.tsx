import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/section-header";
import { SectionNavLink } from "@/components/section-nav-link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("AdminHome");

  return (
    <div className="flex flex-1 flex-col">
      <SectionHeader>
        <SectionNavLink href="/admin" exact className="section-nav-brand">
          {t("title")}
        </SectionNavLink>
        <SectionNavLink href="/admin/clients">{t("clients")}</SectionNavLink>
        <SectionNavLink href="/admin/categories">
          {t("categories")}
        </SectionNavLink>
      </SectionHeader>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
