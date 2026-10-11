import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { getPublicTracking } from "@/server/tracking";
import { makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";

async function shipment(status: "BOOKED" | "IN_TRANSIT", trackingNumber = "876-48379155") {
  const user = await makeUser(`${trackingNumber.toLowerCase()}@example.com`);
  const quote = await db.quote.create({
    data: {
      userId: user.id,
      serviceType: "PARCEL",
      origin: { ...nycAddress, phone: "+1 555 0100" },
      destination: parisAddress,
      packages: smallBox,
      status: "ACCEPTED",
      priceCents: 4300,
    },
  });
  return db.shipment.create({
    data: {
      quoteId: quote.id,
      userId: user.id,
      trackingNumber,
      serviceType: "PARCEL",
      status,
      priceCents: 4300,
      paymentMethod: "BALANCE",
      origin: { ...nycAddress, phone: "+1 555 0100" },
      destination: parisAddress,
      events: {
        create: [
          { status: "BOOKED", location: "New York", countryCode: "US", createdAt: new Date("2026-10-01T10:00:00Z") },
          { status: "IN_TRANSIT", location: "JFK", countryCode: "US", note: "Departed hub", createdAt: new Date("2026-10-02T10:00:00Z") },
        ],
      },
    },
  });
}

describe("getPublicTracking", () => {
  beforeEach(resetDb);

  it("finds a shipment regardless of case and surrounding spaces", async () => {
    await shipment("IN_TRANSIT");
    expect((await getPublicTracking("87648379155"))?.trackingNumber).toBe("876-48379155");
    expect((await getPublicTracking("  awb 876 4837 9155 "))?.trackingNumber).toBe("876-48379155");
  });

  it("returns events oldest first with city/country route only", async () => {
    await shipment("IN_TRANSIT");
    const t = await getPublicTracking("876-48379155");
    expect(t).toMatchObject({
      status: "IN_TRANSIT",
      serviceType: "PARCEL",
      origin: { city: "New York", countryCode: "US", lat: null, lng: null },
      destination: { city: "Paris", countryCode: "FR", lat: null, lng: null },
    });
    expect(t?.events.map((e) => e.status)).toEqual(["BOOKED", "IN_TRANSIT"]);
  });

  it("includes city coordinates when the shipment has them", async () => {
    const s = await shipment("IN_TRANSIT");
    await db.shipment.update({ where: { id: s.id }, data: { originLat: 40.71, originLng: -74, destLat: 48.86, destLng: 2.35 } });
    const t = await getPublicTracking("876-48379155");
    expect(t?.origin).toEqual({ city: "New York", countryCode: "US", lat: 40.71, lng: -74 });
    expect(t?.destination).toEqual({ city: "Paris", countryCode: "FR", lat: 48.86, lng: 2.35 });
  });

  it("includes schedule dates, mode and ports", async () => {
    const s = await shipment("IN_TRANSIT");
    await db.shipment.update({
      where: { id: s.id },
      data: {
        transportMode: "AIR",
        departurePort: "JFK",
        arrivalPort: "CDG",
        departureDate: new Date("2026-10-21T12:00:00Z"),
        estimatedArrival: new Date("2026-10-23T12:00:00Z"),
        estimatedDelivery: new Date("2026-10-24T12:00:00Z"),
        nextStop: "New York cargo hub",
      },
    });
    const t = await getPublicTracking("876-48379155");
    expect(t).toMatchObject({ transportMode: "AIR", departurePort: "JFK", arrivalPort: "CDG" });
    expect(t?.estimatedArrival?.toISOString()).toBe("2026-10-23T12:00:00.000Z");
    expect(t?.estimatedDelivery?.toISOString()).toBe("2026-10-24T12:00:00.000Z");
    expect(t?.nextStop).toBe("New York cargo hub");
  });

  it("exposes no price, names, phone numbers, street lines, emails, weights or contents", async () => {
    const s = await shipment("IN_TRANSIT");
    await db.shipment.update({
      where: { id: s.id },
      data: {
        customerEmail: "secret@example.com",
        contents: "Jewellery",
        declaredValueCents: 999999,
        actualWeightKg: 5,
        chargeableWeightKg: 6,
        packages: [{ weightKg: 5, lengthCm: 1, widthCm: 1, heightCm: 1, qty: 1 }],
      },
    });
    const json = JSON.stringify(await getPublicTracking("876-48379155"));
    expect(json).not.toMatch(
      /"(priceCents|name|phone|line1|line2|email|postcode|userId|customerEmail|contents|declaredValueCents|actualWeightKg|chargeableWeightKg|packages|weightKg)"/,
    );
    expect(json).not.toContain("secret@example.com");
    expect(json).not.toContain("Jewellery");
    expect(json).not.toContain("Ann Sender");
    expect(json).not.toContain("555");
  });

  it("returns null for malformed input without touching the database", async () => {
    const spy = vi.spyOn(db.shipment, "findUnique");
    expect(await getPublicTracking("not-a-number")).toBeNull();
    expect(await getPublicTracking("")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns null for an unknown but well-formed number", async () => {
    expect(await getPublicTracking("876-00000000")).toBeNull();
  });

  it("still finds legacy SHP- numbers", async () => {
    await shipment("BOOKED", "SHP-ABCD234567");
    expect((await getPublicTracking(" shp-abcd234567 "))?.trackingNumber).toBe("SHP-ABCD234567");
  });

});
