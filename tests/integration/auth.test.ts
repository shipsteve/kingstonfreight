import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { registerUser } from "@/server/actions/auth";
import { authorizeCredentials } from "@/server/auth-credentials";
import { resetDb } from "./helpers";

describe("registerUser", () => {
  beforeEach(resetDb);

  it("creates a CUSTOMER with a bcrypt hash and lowercased email", async () => {
    const res = await registerUser({ name: "Ann", email: "Ann@Example.com", password: "password123" });
    expect(res.ok).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: "ann@example.com" } });
    expect(user.role).toBe("CUSTOMER");
    expect(user.passwordHash).not.toContain("password123");
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("rejects a duplicate email regardless of case", async () => {
    await registerUser({ name: "Ann", email: "ann@example.com", password: "password123" });
    const res = await registerUser({ name: "Ann 2", email: "ANN@example.com", password: "password123" });
    expect(res).toEqual({ ok: false, error: "Email already registered" });
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const res = await registerUser({ name: "Ann", email: "ann@example.com", password: "short" });
    expect(res.ok).toBe(false);
    expect(await db.user.count()).toBe(0);
  });
});

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ name: "Ann", email: "ann@example.com", password: "password123" });
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
