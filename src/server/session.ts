import { auth } from "./auth";

export type CurrentUser = { id: string; email: string; role: "CUSTOMER" | "ADMIN" };

export class UnauthorizedError extends Error {}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? "", role: session.user.role };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Please log in");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new UnauthorizedError("Not authorized");
  return user;
}
