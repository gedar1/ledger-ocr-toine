import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AdminSidebar } from "@/components/admin-sidebar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import logo_ledger_2 from "@/assets/images/logo_ledger_2.png";
import Image from "next/image";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const home = await getTranslations("AdminHome");
  // const navigation = await getTranslations("AdminNavigation");
  // console.log(navigation("navigationLabel"));

  return (
    <div className="admin-shell">
      <div className="admin-main">
        <header className="site-header admin-header">
          <div className="admin-header-inner">
            <Image
              width={90}
              src={logo_ledger_2}
              alt="logo"
              className="object-cover"
            />

            {/* <p className="admin-header-context">{home("title")}</p> */}
            <LocaleSwitcher />
          </div>
        </header>
        <div className="admin-content">
          <AdminSidebar
            title={home("title")}
            clients={home("clients")}
            reviewQueue={home("reviewQueue")}
            categories={home("categories")}
            // navigationLabel={navigation("navigationLabel")}
            // openMenu={navigation("openMenu")}
            // closeMenu={navigation("closeMenu")}
          />

          {children}
        </div>
      </div>
    </div>
  );
}
