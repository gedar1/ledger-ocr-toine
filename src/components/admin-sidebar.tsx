"use client";

import Image, { type StaticImageData } from "next/image";
import { usePathname } from "next/navigation";

import dashboard_ from "@/assets/icons/landmark.svg";
import dashboardActive from "@/assets/icons/landmark_white.svg";
import review_ from "@/assets/icons/scan-search.svg";
import reviewActive from "@/assets/icons/scan-search_white.svg";
import clients_ from "@/assets/icons/user-round-group.svg";
import clientsActive from "@/assets/icons/user-round-group_white.svg";
import categories_ from "@/assets/icons/list-tree.svg";
import categoriesActive from "@/assets/icons/list-tree_white.svg";
import chevron_left from "@/assets/icons/circle_chevron_left.svg";
import chevron_right from "@/assets/icons/circle_chevron_right.svg";
import { useState } from "react";
import { SectionNavLink } from "./section-nav-link";

type SidebarIconProps = {
  icon: StaticImageData;
  activeIcon: StaticImageData;
  active: boolean;
  alt: string;
};

function SidebarIcon({
  icon,
  activeIcon,
  active,
  alt,
}: Readonly<SidebarIconProps>) {
  return (
    <Image src={active ? activeIcon : icon} alt={alt} width={20} height={20} />
  );
}

type AdminSidebarProps = {
  title?: string;
  clients: string;
  reviewQueue: string;
  categories: string;
};

export const AdminSidebar = ({
  title,
  clients,
  reviewQueue,
  categories,
}: Readonly<AdminSidebarProps>) => {
  const pathname = usePathname();

  const sidebarItems = [
    {
      label: title,
      href: "/admin",
      icon: dashboard_,
      activeIcon: dashboardActive,
      alt: "Dashboard",
    },
    {
      label: reviewQueue,
      href: "/admin/review",
      icon: review_,
      activeIcon: reviewActive,
      alt: "Revisión",
    },
    {
      label: clients,
      href: "/admin/clients",
      icon: clients_,
      activeIcon: clientsActive,
      alt: "clients",
    },
    {
      label: categories,
      href: "/admin/categories",
      icon: categories_,
      activeIcon: categoriesActive,
      alt: "Categorías",
    },
  ];

  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside className={`${isOpen ? "admin-sidebar-open" : "admin-sidebar"}`}>
      <div className="admin-sidebar-header">
        <button
          type="button"
          className="admin-sidebar-toggle"
          aria-expanded={isOpen}
          aria-controls="admin-sidebar-navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? (
            <Image
              alt="chevron_right"
              src={chevron_right}
              width={32}
              height={32}
            />
          ) : (
            <Image
              alt="chevron_left"
              src={chevron_left}
              width={32}
              height={32}
            />
          )}
        </button>
      </div>
      <nav
        id="admin-sidebar-navigation"
        aria-label="Navegación del administrador"
        className="admin-sidebar-nav"
      >
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <SectionNavLink
              key={item.href}
              href={item.href}
              exact
              className={`admin-sidebar-link ${!isOpen ? "" : "close"}`}
            >
              <SidebarIcon
                icon={item.icon}
                activeIcon={item.activeIcon}
                active={isActive}
                alt={item.alt}
              />
              {isOpen ? null : <span>{item.label}</span>}
            </SectionNavLink>
          );
        })}
      </nav>
    </aside>
  );
};
