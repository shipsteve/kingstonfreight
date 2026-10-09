// Drop-in replacement for @/server/session in integration tests:
//   vi.mock("@/server/session", () => import("./session-mock"));
import type { CurrentUser } from "@/server/session";

let current: CurrentUser | null = null;

export class UnauthorizedError extends Error {}

export function asUser(user: CurrentUser | null) {
  current = user;
}

export async function getCurrentUser() {
  return current;
}

export async function requireUser() {
  if (!current) throw new UnauthorizedError("Please log in");
  return current;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new UnauthorizedError("Not authorized");
  return user;
}
