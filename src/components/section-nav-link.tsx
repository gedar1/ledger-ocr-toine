"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type SectionNavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  exact?: boolean;
};

export function SectionNavLink({
  href,
  children,
  className = "",
  exact = false,
}: SectionNavLinkProps) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`section-nav-link ${active ? "section-nav-link-active" : ""} ${className}`.trim()}
    >
      {children}
    </Link>
  );
}
