import bcrypt from "bcryptjs";
import { db } from "./db";

export type SessionUser = { id: string; email: string; name: string; role: "CUSTOMER" | "ADMIN" };

export async function authorizeCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
