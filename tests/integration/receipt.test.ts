import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { createAdminOrder } from "@/server/actions/admin-orders";
import { getReceiptForAdmin, getReceiptForOwner } from "@/server/queries/receipt";
import { makeUser, nycAddress, parisAddress, resetDb } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/server/geocode", () => ({ geocodeCity: vi.fn(async () => null) }));

describe("receipt data", () => {
  let shipmentId: string;
  let owner: Awaited<ReturnType<typeof makeUser>>;
  let admin: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    await resetDb();
    owner = await makeUser("owner@example.com");
    admin = await makeUser("ops@example.com", "ADMIN");
    asUser(admin);
    const res = await createAdminOrder({
      customerEmail: "owner@example.com",
      sender: { ...nycAddress, phone: "+1 212 555 0100" },
      recipient: parisAddress,
      serviceType: "FREIGHT",
      transportMode: "AIR",
      departurePort: "JFK",
      arrivalPort: "CDG",
      departureDate: "2026-10-21",
      estimatedArrival: "2026-10-23",
      packages: [{ weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20, qty: 2 }],
      contents: "Books",
      declaredValueCents: 20000,
      priceCents: 9900,
      billTo: "SENDER",
      payment: "COUNTER",
    });
    if (!res.ok) throw new Error(res.error);
    shipmentId = res.data.shipmentId;
    // Counter orders are linked via the emailed claim link; link directly here to test receipt access.
    await db.shipment.update({ where: { id: shipmentId }, data: { userId: owner.id } });
  });

  it("gives admins the full receipt", async () => {
    const r = await getReceiptForAdmin(shipmentId);
    expect(r).toMatchObject({
      sender: { name: "Ann Sender", line1: "1 Main St", phone: "+1 212 555 0100" },
      recipient: { city: "Paris" },
      pieces: [{ qty: 2, weightKg: 5 }],
      actualWeightKg: 10,
      chargeableWeightKg: 10,
      priceCents: 9900,
      paymentMethod: "COUNTER",
      issuedBy: "ops@example.com",
      contents: "Books",
    });
    expect(r?.trackingNumber).toMatch(/^876-[0-9]{8}$/);
  });

  it("gives the owner their receipt and hides it from everyone else", async () => {
    asUser(owner);
    expect(await getReceiptForOwner(shipmentId)).not.toBeNull();
    asUser(await makeUser("someone@example.com"));
    expect(await getReceiptForOwner(shipmentId)).toBeNull();
    asUser(null);
    expect(await getReceiptForOwner(shipmentId)).toBeNull();
  });

  it("is not available to customers via the admin route", async () => {
    asUser(owner);
    await expect(getReceiptForAdmin(shipmentId)).rejects.toThrow();
  });

  it("returns null for unknown shipments", async () => {
    expect(await getReceiptForAdmin("nope")).toBeNull();
    expect(await db.shipment.count()).toBe(1);
  });
});
