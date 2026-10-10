import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (same
 * `auth()`-wrapped signature and `matcher` config). See
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * This file only handles coarse redirects for UX. Every API route under
 * src/app/api/** re-checks session role/ownership itself — this proxy is
 * never the sole authorization gate (per FEAT-002's CRITICAL requirement).
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (pathname.startsWith("/admin") && session.user.role !== "ACCOUNTANT") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (pathname.startsWith("/app")) {
    if (session.user.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    }
    if (session.user.clientStatus !== "ACTIVE") {
      return NextResponse.redirect(
        new URL("/estado-cuenta", req.nextUrl.origin)
      );
    }
  }
});

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
