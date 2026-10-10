import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { loginAction, registerUser } from "@/server/actions/auth";
import { authorizeCredentials } from "@/server/auth-credentials";
import { resetDb } from "./helpers";

// signIn needs a live Next request; stand in with "wrong password" so the login rate limit can be exercised.
vi.mock("@/server/auth", async () => {
  const { CredentialsSignin } = await import("next-auth");
  return {
    signIn: vi.fn(async () => {
      throw new CredentialsSignin();
    }),
    signOut: vi.fn(),
  };
});

describe("registerUser", () => {
  beforeEach(resetDb);

  it("creates a CUSTOMER with a bcrypt hash and lowercased email", async () => {
    const res = await registerUser({ name: "Ann", email: "Ann@Example.com", password: "password123", acceptTerms: true });
    expect(res.ok).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: "ann@example.com" } });
    expect(user.role).toBe("CUSTOMER");
    expect(user.passwordHash).not.toContain("password123");
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("requires accepting the Terms and Privacy Policy", async () => {
    const res = await registerUser({ name: "Ann", email: "ann@example.com", password: "password123", acceptTerms: false });
    expect(res).toEqual({ ok: false, error: "Please accept the Terms of Service and Privacy Policy" });
    expect(await db.user.count()).toBe(0);
  });

  it("records when the terms were accepted", async () => {
    await registerUser({ name: "Ann", email: "ann@example.com", password: "password123", acceptTerms: true });
    const user = await db.user.findUniqueOrThrow({ where: { email: "ann@example.com" } });
    expect(user.termsAcceptedAt).not.toBeNull();
  });

  it("rejects a duplicate email regardless of case", async () => {
    await registerUser({ name: "Ann", email: "ann@example.com", password: "password123", acceptTerms: true });
    const res = await registerUser({ name: "Ann 2", email: "ANN@example.com", password: "password123", acceptTerms: true });
    expect(res).toEqual({ ok: false, error: "Email already registered" });
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const res = await registerUser({ name: "Ann", email: "ann@example.com", password: "short", acceptTerms: true });
    expect(res.ok).toBe(false);
    expect(await db.user.count()).toBe(0);
  });
});

describe("rate limits", () => {
  beforeEach(resetDb);

  it("blocks a sixth sign-up from the same IP within 15 minutes", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await registerUser({ name: "A", email: `a${i}@example.com`, password: "password123", acceptTerms: true })).ok).toBe(true);
    }
    expect(await registerUser({ name: "A", email: "a6@example.com", password: "password123", acceptTerms: true })).toEqual({
      ok: false,
      error: "Too many attempts. Please try again in a few minutes.",
    });
  });

  it("blocks repeated login attempts from the same IP", async () => {
    for (let i = 0; i < 10; i++) await loginAction({ email: "x@example.com", password: "wrong-password" });
    expect(await loginAction({ email: "x@example.com", password: "wrong-password" })).toEqual({
      ok: false,
      error: "Too many attempts. Please try again in a few minutes.",
    });
  });
});

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ name: "Ann", email: "ann@example.com", password: "password123", acceptTerms: true });
  });

  it("returns the user for the correct password, any email case", async () => {
    const user = await authorizeCredentials("ANN@example.com", "password123");
    expect(user).toMatchObject({ email: "ann@example.com", role: "CUSTOMER" });
  });

  it("returns null for a wrong password or unknown email", async () => {
    expect(await authorizeCredentials("ann@example.com", "wrong-password")).toBeNull();
    expect(await authorizeCredentials("nobody@example.com", "password123")).toBeNull();
  });
});
