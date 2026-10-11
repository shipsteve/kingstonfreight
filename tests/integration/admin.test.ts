import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { declineQuote, priceQuote } from "@/server/actions/admin-quotes";
import {
  deleteParcelRate,
  deleteZone,
  updateCourierRate,
  upsertParcelRate,
  upsertZone,
} from "@/server/actions/admin-pricing";
import { setPaymentStatus, updateShipmentStatus } from "@/server/actions/admin-shipments";
import { sendEmail } from "@/server/email";
import { getAdminCounts, listQuotesToPrice } from "@/server/queries/admin";
import { seed } from "../../prisma/seed";
import { laAddress, makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";
import { getPublicTracking } from "@/server/tracking";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));

type Status = "BOOKED" | "IN_TRANSIT" | "DELIVERED" | "EXCEPTION";

async function makeQuote(userId: string, serviceType: "PARCEL" | "FREIGHT", status: "PENDING_REVIEW" | "PRICED") {
  return db.quote.create({
    data: {
      userId,
      serviceType,
      origin: nycAddress,
      destination: parisAddress,
      packages: smallBox,
      status,
      priceCents: status === "PRICED" ? 1000 : null,
    },
  });
}

let counter = 0;
async function makeShipment(userId: string, status: Status) {
  const quote = await makeQuote(userId, "PARCEL", "PRICED");
  counter++;
  return db.shipment.create({
    data: {
      quoteId: quote.id,
      userId,
      trackingNumber: `SHP-TEST${String(counter).padStart(6, "2")}`,
      serviceType: "PARCEL",
      status,
      priceCents: 1000,
      paymentMethod: "COUNTER",
      origin: nycAddress,
      destination: parisAddress,
    },
  });
}

describe("admin actions", () => {
  let admin: Awaited<ReturnType<typeof makeUser>>;
  let customer: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    await resetDb();
    await seed(db);
    vi.clearAllMocks();
    admin = await makeUser("ops@example.com", "ADMIN");
    customer = await makeUser("cust@example.com");
    asUser(admin);
  });

  it("refuses every admin action for customers", async () => {
    asUser(customer);
    const zone = await db.zone.findFirstOrThrow();
    const calls = [
      priceQuote({ quoteId: "x", priceCents: 100 }),
      declineQuote({ quoteId: "x", note: "no" }),
      updateShipmentStatus({ shipmentId: "x", status: "IN_TRANSIT", location: "NYC" }),
      setPaymentStatus({ shipmentId: "x", paymentStatus: "PAID" }),
      upsertZone({ name: "Z", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["BR"] }),
      deleteZone(zone.id),
      upsertParcelRate({ originZoneId: zone.id, destZoneId: zone.id, maxWeightKg: 1, priceCents: 1 }),
      deleteParcelRate("x"),
      updateCourierRate({ baseFeeCents: 1, perKmCents: 1, maxKm: 1 }),
    ];
    for (const res of await Promise.all(calls)) expect(res).toEqual({ ok: false, error: "Not authorized" });
  });

  describe("quotes to price", () => {
    it("prices a pending parcel quote too", async () => {
      const q = await makeQuote(customer.id, "PARCEL", "PENDING_REVIEW");
      expect((await priceQuote({ quoteId: q.id, priceCents: 2500 })).ok).toBe(true);
      const after = await db.quote.findUniqueOrThrow({ where: { id: q.id } });
      expect(after).toMatchObject({ status: "PRICED", priceCents: 2500 });
      expect(after.expiresAt).not.toBeNull();
    });

    it("lists every pending quote, with a suggested price for parcels and none for freight", async () => {
      const parcel = await makeQuote(customer.id, "PARCEL", "PENDING_REVIEW");
      const freight = await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
      await makeQuote(customer.id, "PARCEL", "PRICED");
      const list = await listQuotesToPrice();
      expect(list.map((q) => q.id).sort()).toEqual([parcel.id, freight.id].sort());
      expect(list.find((q) => q.id === parcel.id)?.suggestedCents).toBeGreaterThan(0);
      expect(list.find((q) => q.id === freight.id)?.suggestedCents).toBeNull();
    });

    it("prices a pending freight quote, sets a 7 day expiry, and emails the customer", async () => {
      const q = await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
      const res = await priceQuote({ quoteId: q.id, priceCents: 125000, note: "Includes port fees" });
      expect(res.ok).toBe(true);
      const after = await db.quote.findUniqueOrThrow({ where: { id: q.id } });
      expect(after).toMatchObject({ status: "PRICED", priceCents: 125000, adminNote: "Includes port fees" });
      const days = (after.expiresAt!.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.99);
      expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(expect.objectContaining({ to: "cust@example.com" }));
    });

    it("refuses to price quotes that are not pending review", async () => {
      const priced = await makeQuote(customer.id, "PARCEL", "PRICED");
      expect((await priceQuote({ quoteId: priced.id, priceCents: 100 })).ok).toBe(false);
      const pending = await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
      await priceQuote({ quoteId: pending.id, priceCents: 100 });
      expect((await priceQuote({ quoteId: pending.id, priceCents: 200 })).ok).toBe(false);
    });

    it("rejects a non-positive price", async () => {
      const q = await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
      expect((await priceQuote({ quoteId: q.id, priceCents: 0 })).ok).toBe(false);
    });

    it("declines a pending freight quote", async () => {
      const q = await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
      expect((await declineQuote({ quoteId: q.id, note: "We don't ship hazmat" })).ok).toBe(true);
      expect(await db.quote.findUniqueOrThrow({ where: { id: q.id } })).toMatchObject({
        status: "DECLINED",
        adminNote: "We don't ship hazmat",
      });
    });
  });

  describe("shipments", () => {
    it("publishes confirmed checkpoints and messages without changing an existing tracking ID or transit status", async () => {
      const s = await makeShipment(customer.id, "IN_TRANSIT");
      s.trackingNumber = "SHP-ABCD234567";
      await db.shipment.update({ where: { id: s.id }, data: { trackingNumber: s.trackingNumber } });
      const result = await updateShipmentStatus({ shipmentId: s.id, status: "IN_TRANSIT", location: "JFK hub", countryCode: "US",
        lat: 40.6413, lng: -73.7781, note: "Loaded and confirmed by dispatch" });
      expect(result.ok).toBe(true);
      const publicTracking = await getPublicTracking(s.trackingNumber);
      expect(publicTracking).toMatchObject({ trackingNumber: s.trackingNumber, status: "IN_TRANSIT" });
      expect(publicTracking?.events.at(-1)).toMatchObject({ location: "JFK hub", lat: 40.6413, lng: -73.7781, note: "Loaded and confirmed by dispatch", confirmedAt: expect.any(Date) });
      expect((await db.shipment.findUniqueOrThrow({ where: { id: s.id } })).trackingNumber).toBe(s.trackingNumber);
    });

    it("rejects partial or out-of-range map coordinates", async () => {
      const s = await makeShipment(customer.id, "IN_TRANSIT");
      const input = { shipmentId: s.id, status: "IN_TRANSIT" as const, location: "Hub" };
      expect((await updateShipmentStatus({ ...input, lat: 45 })).ok).toBe(false);
      expect((await updateShipmentStatus({ ...input, lat: 91, lng: 0 })).ok).toBe(false);
      expect((await updateShipmentStatus({ ...input, lat: 0, lng: -181 })).ok).toBe(false);
      expect(await db.trackingEvent.count()).toBe(0);
    });

    it("writes an event and emails on a valid status change", async () => {
      const s = await makeShipment(customer.id, "BOOKED");
      const res = await updateShipmentStatus({ shipmentId: s.id, status: "IN_TRANSIT", location: "JFK hub", countryCode: "us" });
      expect(res.ok).toBe(true);
      const after = await db.shipment.findUniqueOrThrow({ where: { id: s.id }, include: { events: true } });
      expect(after.status).toBe("IN_TRANSIT");
      expect(after.events).toEqual([expect.objectContaining({ status: "IN_TRANSIT", location: "JFK hub", countryCode: "US" })]);
      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
    });

    it("rejects an invalid transition with a clear message", async () => {
      const s = await makeShipment(customer.id, "DELIVERED");
      expect(await updateShipmentStatus({ shipmentId: s.id, status: "IN_TRANSIT", location: "X" })).toEqual({
        ok: false,
        error: "Cannot move from DELIVERED to IN_TRANSIT",
      });
      expect(await db.trackingEvent.count()).toBe(0);
    });

    it("requires a location", async () => {
      const s = await makeShipment(customer.id, "BOOKED");
      expect((await updateShipmentStatus({ shipmentId: s.id, status: "IN_TRANSIT", location: " " })).ok).toBe(false);
    });

    it("toggles payment status", async () => {
      const s = await makeShipment(customer.id, "BOOKED");
      await setPaymentStatus({ shipmentId: s.id, paymentStatus: "PAID" });
      expect((await db.shipment.findUniqueOrThrow({ where: { id: s.id } })).paymentStatus).toBe("PAID");
      await setPaymentStatus({ shipmentId: s.id, paymentStatus: "UNPAID" });
      expect((await db.shipment.findUniqueOrThrow({ where: { id: s.id } })).paymentStatus).toBe("UNPAID");
    });
  });

  describe("pricing", () => {
    it("rejects a negative rate price", async () => {
      const zone = await db.zone.findFirstOrThrow();
      const res = await upsertParcelRate({ originZoneId: zone.id, destZoneId: zone.id, maxWeightKg: 1, priceCents: -5 });
      expect(res.ok).toBe(false);
    });

    it("updates an existing band in place", async () => {
      const zone = await db.zone.findFirstOrThrow();
      const before = await db.parcelRate.count();
      await upsertParcelRate({ originZoneId: zone.id, destZoneId: zone.id, maxWeightKg: 1, priceCents: 777 });
      expect(await db.parcelRate.count()).toBe(before);
      const rate = await db.parcelRate.findFirstOrThrow({
        where: { originZoneId: zone.id, destZoneId: zone.id, maxWeightKg: 1 },
      });
      expect(rate.priceCents).toBe(777);
    });

    it("refuses to delete a zone that still has rates", async () => {
      const zone = await db.zone.findFirstOrThrow();
      expect(await deleteZone(zone.id)).toEqual({ ok: false, error: "Zone has rates; delete them first" });
    });

    it("creates and deletes an empty zone", async () => {
      const res = await upsertZone({ name: "South America", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["br", "AR"] });
      if (!res.ok) throw new Error(res.error);
      expect((await db.zone.findUniqueOrThrow({ where: { id: res.data.id } })).countryCodes).toEqual(["BR", "AR"]);
      expect((await deleteZone(res.data.id)).ok).toBe(true);
    });

    it("rejects a duplicate zone name", async () => {
      const res = await upsertZone({ name: "Europe", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: [] });
      expect(res.ok).toBe(false);
    });

    it("new courier rates feed the suggested price", async () => {
      await updateCourierRate({ baseFeeCents: 1000, perKmCents: 200, maxKm: 50 });
      await db.quote.create({
        data: {
          userId: customer.id,
          serviceType: "COURIER",
          origin: nycAddress,
          destination: laAddress,
          packages: [],
          distanceKm: 5,
          status: "PENDING_REVIEW",
        },
      });
      const [q] = await listQuotesToPrice();
      expect(q.suggestedCents).toBe(2000);
    });
  });

  it("counts the admin dashboard numbers", async () => {
    await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
    await makeQuote(customer.id, "FREIGHT", "PENDING_REVIEW");
    await makeShipment(customer.id, "IN_TRANSIT");
    await makeShipment(customer.id, "IN_TRANSIT");
    await makeShipment(customer.id, "IN_TRANSIT");
    await makeShipment(customer.id, "EXCEPTION");
    await makeShipment(customer.id, "DELIVERED");
    expect(await getAdminCounts()).toEqual({ pendingQuotes: 2, topUpsToReview: 0, inTransit: 3, exceptions: 1 });
  });
});
