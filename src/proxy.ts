import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { routeAccess } from "@/lib/route-access";
import { authConfig } from "@/server/auth.config";

const { auth } = NextAuth(authConfig);

// Optimistic check only; every server action and page re-checks with requireUser/requireAdmin.
export const proxy = auth((req) => {
  const decision = routeAccess(req.nextUrl.pathname, req.auth?.user?.role ?? null);
  if (decision.allow) return NextResponse.next();
  return NextResponse.redirect(new URL(decision.redirect, req.nextUrl.origin));
});

export const config = {
  matcher: ["/dashboard/:path*", "/quotes/:path*", "/shipments/:path*", "/admin/:path*"],
};
