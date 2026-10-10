"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/redirect";
import { signIn, signOut } from "../auth";
import { clientIp } from "../client-ip";
import { rateLimit } from "../rate-limit";
import { db } from "../db";
import { claimShipmentsForEmail } from "../shipments";
import { fail, ok, type ActionResult } from "../result";

const TOO_MANY = "Too many attempts. Please try again in a few minutes.";
const FIFTEEN_MIN = 15 * 60_000;

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  acceptTerms: z.boolean().refine((v) => v, "Please accept the Terms of Service and Privacy Policy"),
});

export async function registerUser(input: z.input<typeof registerSchema>): Promise<ActionResult<{ id: string }>> {
  if (!rateLimit(`register:${await clientIp()}`, 5, FIFTEEN_MIN)) return fail(TOO_MANY);
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) return fail("Email already registered");
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10), termsAcceptedAt: new Date() },
    });
    await claimShipmentsForEmail(user.id, email);
    return ok({ id: user.id });
  } catch {
    return fail("Email already registered");
  }
}

/** Signs in and redirects to `next` (relative paths only). */
export async function loginAction(input: { email: string; password: string; next?: string }): Promise<ActionResult<never>> {
  if (!rateLimit(`login:${await clientIp()}`, 10, FIFTEEN_MIN)) return fail(TOO_MANY);
  const next = safeRedirectPath(input.next);
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
