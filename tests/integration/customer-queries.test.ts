import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { getMyShipment, listMyQuotes, listMyShipments } from "@/server/queries/customer";
import { makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));

async function quoteFor(userId: string, createdAt: Date) {
  return db.quote.create({
    data: {
      userId,
      serviceType: "PARCEL",
      origin: nycAddress,
      destination: parisAddress,
      packages: smallBox,
      status: "PRICED",
      priceCents: 1000,
      createdAt,
    },
  });
}

async function shipmentFor(userId: string, n: number, createdAt: Date) {
  const quote = await quoteFor(userId, createdAt);
  return db.shipment.create({
    data: {
      quoteId: quote.id,
      userId,
      trackingNumber: `SHP-AAAAAAAAA${n}`,
      serviceType: "PARCEL",
      status: "BOOKED",
      priceCents: 1000,
      paymentMethod: "CARD",
      origin: nycAddress,
      destination: parisAddress,
      createdAt,
      events: {
        create: [
          { status: "BOOKED", location: "New York", createdAt: new Date(createdAt.getTime() + 1000) },
          { status: "PICKED_UP", location: "New York", createdAt: new Date(createdAt.getTime() + 2000) },
        ],
      },
    },
  });
}

describe("customer queries", () => {
  let a: Awaited<ReturnType<typeof makeUser>>;
  let b: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    await resetDb();
    a = await makeUser("a@example.com");
    b = await makeUser("b@example.com");
  });

  it("lists only my quotes, newest first", async () => {
    await quoteFor(a.id, new Date("2026-01-01"));
    const newer = await quoteFor(a.id, new Date("2026-02-01"));
    await quoteFor(b.id, new Date("2026-03-01"));
    asUser(a);
    const quotes = await listMyQuotes();
    expect(quotes).toHaveLength(2);
    expect(quotes[0].id).toBe(newer.id);
  });

  it("lists only my shipments, newest first", async () => {
    await shipmentFor(a.id, 2, new Date("2026-01-01"));
    const newer = await shipmentFor(a.id, 3, new Date("2026-02-01"));
    await shipmentFor(b.id, 4, new Date("2026-03-01"));
    asUser(a);
    const shipments = await listMyShipments();
    expect(shipments.map((s) => s.id)).toEqual([newer.id, expect.any(String)]);
    expect(shipments).toHaveLength(2);
  });

  it("returns my shipment with events oldest first", async () => {
    const s = await shipmentFor(a.id, 2, new Date("2026-01-01"));
    asUser(a);
    const mine = await getMyShipment(s.id);
    expect(mine?.events.map((e) => e.status)).toEqual(["BOOKED", "PICKED_UP"]);
  });

  it("returns null for someone else's shipment", async () => {
    const s = await shipmentFor(a.id, 2, new Date("2026-01-01"));
    asUser(b);
    expect(await getMyShipment(s.id)).toBeNull();
  });

  it("returns empty results when logged out", async () => {
    await quoteFor(a.id, new Date("2026-01-01"));
    asUser(null);
    expect(await listMyQuotes()).toEqual([]);
    expect(await listMyShipments()).toEqual([]);
  });
});
