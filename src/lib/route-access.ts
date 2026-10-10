export type RouteDecision = { allow: true } | { allow: false; redirect: string };

const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");
const CUSTOMER_PREFIXES = ["/dashboard", "/quotes", "/shipments", "/account", "/claim"];

export function routeAccess(path: string, role: "CUSTOMER" | "ADMIN" | null): RouteDecision {
  const isAdmin = under(path, "/admin");
  const needsLogin = isAdmin || CUSTOMER_PREFIXES.some((p) => under(path, p));
  if (!needsLogin) return { allow: true };
  if (!role) return { allow: false, redirect: `/login?next=${encodeURIComponent(path)}` };
  if (isAdmin && role !== "ADMIN") return { allow: false, redirect: "/" };
  return { allow: true };
}
