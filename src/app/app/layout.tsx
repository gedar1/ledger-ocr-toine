import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/section-header";
import { SectionNavLink } from "@/components/section-nav-link";
import Image from "next/image";
import logo from "@/assets/images/logo_ledger_2.png";

export default async function ClientSectionLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const t = await getTranslations("ClientExpenses");

  return (
    <div className="flex flex-1 flex-col">
      <SectionHeader>
        <a href="/app">
          <Image alt="logo" src={logo} priority />
        </a>
        {/* <SectionNavLink href="/app" exact className="section-nav-brand"> */}
        {/* </SectionNavLink> */}
        <SectionNavLink href="/app/expenses">{t("title")}</SectionNavLink>
      </SectionHeader>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
