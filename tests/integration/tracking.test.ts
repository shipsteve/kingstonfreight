import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { getPublicTracking } from "@/server/tracking";
import { makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";

async function shipment(status: "AWAITING_PAYMENT" | "IN_TRANSIT", trackingNumber = "SHP-ABCD234567") {
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
      paymentMethod: "CARD",
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
    expect((await getPublicTracking("shp-abcd234567"))?.trackingNumber).toBe("SHP-ABCD234567");
    expect((await getPublicTracking("  SHP-ABCD234567 "))?.trackingNumber).toBe("SHP-ABCD234567");
  });

  it("returns events oldest first with city/country route only", async () => {
    await shipment("IN_TRANSIT");
    const t = await getPublicTracking("SHP-ABCD234567");
    expect(t).toMatchObject({
      status: "IN_TRANSIT",
      serviceType: "PARCEL",
      origin: { city: "New York", countryCode: "US" },
      destination: { city: "Paris", countryCode: "FR" },
    });
    expect(t?.events.map((e) => e.status)).toEqual(["BOOKED", "IN_TRANSIT"]);
  });

  it("exposes no price, names, phone numbers, street lines or emails", async () => {
    await shipment("IN_TRANSIT");
    const json = JSON.stringify(await getPublicTracking("SHP-ABCD234567"));
    expect(json).not.toMatch(/"(priceCents|name|phone|line1|line2|email|postcode|userId)"/);
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
    expect(await getPublicTracking("SHP-ZZZZZZZZZZ")).toBeNull();
  });

  it("hides shipments that are still awaiting payment", async () => {
    await shipment("AWAITING_PAYMENT");
    expect(await getPublicTracking("SHP-ABCD234567")).toBeNull();
  });
});
