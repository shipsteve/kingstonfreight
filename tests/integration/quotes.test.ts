import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { calculatePrice, createQuote, getMyQuote } from "@/server/actions/quotes";
import { seed } from "../../prisma/seed";
import { laAddress, makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));

const parcelInput = { serviceType: "PARCEL" as const, origin: nycAddress, destination: parisAddress, packages: smallBox };
const freightInput = {
  serviceType: "FREIGHT" as const,
  origin: nycAddress,
  destination: parisAddress,
  packages: [{ weightKg: 800, lengthCm: 120, widthCm: 100, heightCm: 150, qty: 2 }],
  freightDetails: { mode: "SEA" as const, cargoType: "Pallets", description: "Machine parts" },
};

describe("quotes", () => {
  beforeEach(async () => {
    await resetDb();
    await seed(db);
    asUser(null);
  });

  it("calculates a parcel price without login", async () => {
    const res = await calculatePrice(parcelInput);
    expect(res).toMatchObject({ ok: true, data: { ok: true } });
  });

  it("calculates a courier price", async () => {
    const res = await calculatePrice({
      serviceType: "COURIER",
      origin: nycAddress,
      destination: laAddress,
      distanceKm: 10,
    });
    expect(res).toEqual({ ok: true, data: { ok: true, priceCents: 1500 + 10 * 150 } });
  });

  it("rate-limits instant pricing per IP", async () => {
    for (let i = 0; i < 60; i++) expect((await calculatePrice(parcelInput)).ok).toBe(true);
    expect(await calculatePrice(parcelInput)).toEqual({
      ok: false,
      error: "Too many requests. Please wait a minute and try again.",
    });
  });

  it("refuses to auto-price freight", async () => {
    expect(await calculatePrice(freightInput)).toEqual({ ok: false, error: "Freight is priced manually" });
  });

  it("requires login to save a quote", async () => {
    expect(await createQuote(parcelInput)).toEqual({ ok: false, error: "Please log in" });
  });

  it("saves a parcel quote as PRICED with a 7 day expiry", async () => {
    const user = await makeUser("ann@example.com");
    asUser(user);
    const res = await createQuote(parcelInput);
    if (!res.ok) throw new Error(res.error);
    const quote = await db.quote.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(quote.status).toBe("PRICED");
    expect(quote.userId).toBe(user.id);
    expect(quote.priceCents).toBeGreaterThan(0);
    const days = (quote.expiresAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThan(7.01);
  });

  it("ignores a client-supplied price", async () => {
    asUser(await makeUser("ann@example.com"));
    const res = await createQuote({ ...parcelInput, priceCents: 1 } as never);
    if (!res.ok) throw new Error(res.error);
    const quote = await db.quote.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(quote.priceCents).not.toBe(1);
  });

  it("saves a freight quote as PENDING_REVIEW with no price", async () => {
    asUser(await makeUser("ann@example.com"));
    const res = await createQuote(freightInput);
    if (!res.ok) throw new Error(res.error);
    const quote = await db.quote.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(quote.status).toBe("PENDING_REVIEW");
    expect(quote.priceCents).toBeNull();
  });

  it("explains why a parcel cannot be priced", async () => {
    asUser(await makeUser("ann@example.com"));
    const heavy = [{ weightKg: 31, lengthCm: 10, widthCm: 10, heightCm: 10, qty: 1 }];
    const res = await createQuote({ ...parcelInput, packages: heavy });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/freight/i);
  });

  it("hides a quote from customers who do not own it", async () => {
    const a = await makeUser("a@example.com");
    const b = await makeUser("b@example.com");
    asUser(a);
    const res = await createQuote(parcelInput);
    if (!res.ok) throw new Error(res.error);
    asUser(b);
    expect(await getMyQuote(res.data.id)).toBeNull();
    asUser(a);
    expect(await getMyQuote(res.data.id)).not.toBeNull();
  });
});
