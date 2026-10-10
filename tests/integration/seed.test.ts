import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { seed } from "../../prisma/seed";
import { resetDb } from "./helpers";

describe("seed", () => {
  beforeEach(resetDb);
  afterEach(() => vi.unstubAllEnvs());

  it("refuses to create an admin without ADMIN_EMAIL and ADMIN_PASSWORD", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    await expect(seed(db)).rejects.toThrow(/ADMIN_PASSWORD/);
    expect(await db.user.count()).toBe(0);
  });

  it("refuses a short admin password", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "short");
    await expect(seed(db)).rejects.toThrow(/at least 8/);
  });

  it("creates admin, zones, full rate matrix and courier rate", async () => {
    await seed(db);
    expect(await db.user.count({ where: { role: "ADMIN", accountStatus: "APPROVED" } })).toBe(1);
    expect(await db.zone.count()).toBe(5);
    expect(await db.parcelRate.count()).toBe(175);
    expect(await db.courierRate.count()).toBe(1);
  });

  it("is idempotent", async () => {
    await seed(db);
    await seed(db);
    expect(await db.user.count()).toBe(1);
    expect(await db.zone.count()).toBe(5);
    expect(await db.parcelRate.count()).toBe(175);
    expect(await db.courierRate.count()).toBe(1);
  });

  it("stores a bcrypt hash, not the plaintext admin password", async () => {
    await seed(db);
    const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    expect(admin.passwordHash).not.toBe(process.env.ADMIN_PASSWORD);
    expect(admin.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});
