"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "../auth";
import { db } from "../db";
import { fail, ok, type ActionResult } from "../result";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function registerUser(input: z.input<typeof registerSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) return fail("Email already registered");
  try {
    const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
    return ok({ id: user.id });
  } catch {
    return fail("Email already registered");
  }
}

/** Signs in and redirects to `next` (relative paths only). */
export async function loginAction(input: { email: string; password: string; next?: string }): Promise<ActionResult<never>> {
  const next = input.next?.startsWith("/") && !input.next.startsWith("//") ? input.next : "/dashboard";
  try {
    await signIn("credentials", { email: input.email, password: input.password, redirectTo: next });
  } catch (e) {
    if (e instanceof AuthError) return fail("Invalid email or password");
    throw e; // redirect
  }
  return fail("Unexpected sign-in result");
}

export async function registerAndLogin(input: z.input<typeof registerSchema> & { next?: string }) {
  const res = await registerUser(input);
  if (!res.ok) return res;
  return loginAction({ email: input.email, password: input.password, next: input.next });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
