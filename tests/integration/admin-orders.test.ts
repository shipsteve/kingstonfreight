import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { createAdminOrder, suggestAdminOrderPrice, updateShipmentSchedule } from "@/server/actions/admin-orders";
import { claimShipment } from "@/server/actions/claim";
import { registerUser } from "@/server/actions/auth";
import { sendEmail } from "@/server/email";
import { balanceCents } from "@/server/ledger";
import { seed } from "../../prisma/seed";
import { makeUser, nycAddress, parisAddress, resetDb } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/server/geocode", () => ({ geocodeCity: vi.fn(async () => null) }));

const order = (over: Record<string, unknown> = {}) => ({
  customerEmail: "Walkin@Example.com",
  sender: { ...nycAddress, phone: "+1 212 555 0100", email: "ann@example.com" },
  recipient: { ...parisAddress, phone: "+33 1 23 45 67 89" },
  serviceType: "FREIGHT" as const,
  transportMode: "AIR" as const,
  departurePort: "jfk",
  arrivalPort: "CDG",
  departureDate: "2026-10-21",
  estimatedArrival: "2026-10-23",
  estimatedDelivery: "2026-10-24",
  packages: [
    { weightKg: 1.2, lengthCm: 10, widthCm: 10, heightCm: 10, qty: 3 },
    { weightKg: 1, lengthCm: 50, widthCm: 40, heightCm: 30, qty: 1 },
  ],
  contents: "Machine parts",
  declaredValueCents: 150000,
  goodsOriginCountry: "us",
  hsCode: "8487.90",
  priceCents: 12500,
  billTo: "SENDER" as const,
  payment: "COUNTER" as const,
  ...over,
});

describe("admin orders", () => {
  let admin: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    await resetDb();
    await seed(db);
    vi.clearAllMocks();
    admin = await makeUser("ops@example.com", "ADMIN");
    asUser(admin);
  });

  it("creates a counter-paid order for someone without an account", async () => {
    const res = await createAdminOrder(order());
    if (!res.ok) throw new Error(res.error);
    expect(res.data.trackingNumber).toMatch(/^876-[0-9]{8}$/);
    const s = await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId }, include: { events: true } });
    expect(s).toMatchObject({
      status: "BOOKED",
      paymentMethod: "COUNTER",
      paymentStatus: "PAID",
      userId: null,
      customerEmail: "walkin@example.com",
      createdById: admin.id,
      quoteId: null,
      transportMode: "AIR",
      departurePort: "JFK",
      arrivalPort: "CDG",
      actualWeightKg: 4.6,
      chargeableWeightKg: 16.5,
      contents: "Machine parts",
      declaredValueCents: 150000,
      goodsOriginCountry: "US",
      hsCode: "8487.90",
      billTo: "SENDER",
      priceCents: 12500,
    });
    expect(s.departureDate?.toISOString()).toBe("2026-10-21T12:00:00.000Z");
    expect(s.estimatedDelivery?.toISOString()).toBe("2026-10-24T12:00:00.000Z");
    expect(s.events).toEqual([expect.objectContaining({ status: "BOOKED", location: "Booked by KingstonFreight" })]);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({ to: "walkin@example.com", html: expect.stringContaining(res.data.trackingNumber) }),
    );
  });

  it("charges an approved customer's balance and links the order", async () => {
    const cust = await makeUser("walkin@example.com");
    await db.user.update({ where: { id: cust.id }, data: { accountStatus: "APPROVED" } });
    await db.ledgerEntry.create({ data: { userId: cust.id, amountCents: 20000, kind: "ADJUSTMENT" } });
    const res = await createAdminOrder(order({ payment: "BALANCE" }));
    if (!res.ok) throw new Error(res.error);
    const s = await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } });
    expect(s).toMatchObject({ userId: cust.id, paymentMethod: "BALANCE", paymentStatus: "PAID" });
    expect(await balanceCents(db, cust.id)).toBe(7500);
  });

  it("refuses to charge a balance without an approved customer account", async () => {
    expect(await createAdminOrder(order({ payment: "BALANCE" }))).toEqual({
      ok: false,
      error: "Charging a balance needs an existing approved customer",
    });
    expect(await db.shipment.count()).toBe(0);
  });

  it("refuses to charge more than the balance", async () => {
    const cust = await makeUser("walkin@example.com");
    await db.user.update({ where: { id: cust.id }, data: { accountStatus: "APPROVED" } });
    await db.ledgerEntry.create({ data: { userId: cust.id, amountCents: 10000, kind: "ADJUSTMENT" } });
    expect(await createAdminOrder(order({ payment: "BALANCE" }))).toEqual({
      ok: false,
      error: "Insufficient balance: the customer needs $25.00 more.",
    });
    expect(await db.shipment.count()).toBe(0);
  });

  it("rejects an arrival before departure, bad ports and missing contents", async () => {
    expect((await createAdminOrder(order({ estimatedArrival: "2026-10-20" }))).ok).toBe(false);
    expect(await createAdminOrder(order({ estimatedDelivery: "2026-10-22" }))).toEqual({
      ok: false,
      error: "Estimated delivery can't be before arrival",
    });
    expect((await createAdminOrder(order({ departurePort: "JFKX" }))).ok).toBe(false);
    expect((await createAdminOrder(order({ contents: " " }))).ok).toBe(false);
    expect((await createAdminOrder(order({ priceCents: 0 }))).ok).toBe(false);
  });

  it("allows orders without dates or ports", async () => {
    const res = await createAdminOrder(
      order({ departurePort: "", arrivalPort: "", departureDate: "", estimatedArrival: "", estimatedDelivery: "" }),
    );
    expect(res.ok).toBe(true);
  });

  it("does not hand a counter order to whoever registers that email first", async () => {
    const res = await createAdminOrder(order());
    if (!res.ok) throw new Error(res.error);
    asUser(null);
    const reg = await registerUser({ name: "Impostor", email: "WALKIN@example.com", password: "password123", acceptTerms: true });
    if (!reg.ok) throw new Error(reg.error);
    expect((await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } })).userId).toBeNull();
  });

  it("does not auto-link a counter order to an existing account with that email", async () => {
    await makeUser("walkin@example.com");
    const res = await createAdminOrder(order());
    if (!res.ok) throw new Error(res.error);
    expect((await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } })).userId).toBeNull();
  });

  it("emails a one-time claim link that adds the order to the account of whoever holds the inbox", async () => {
    const res = await createAdminOrder(order());
    if (!res.ok) throw new Error(res.error);
    const html = vi.mocked(sendEmail).mock.calls.at(-1)![0].html;
    const token = html.match(/\/claim\/([A-Za-z0-9_-]{20,})/)?.[1];
    expect(token).toBeTruthy();
    expect((await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } })).claimTokenHash).not.toContain(token);

    const owner = await makeUser("walkin@example.com");
    asUser(owner);
    expect(await claimShipment(token!)).toEqual({ ok: true, data: { shipmentId: res.data.shipmentId } });
    expect((await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } })).userId).toBe(owner.id);

    asUser(await makeUser("someone@example.com"));
    expect(await claimShipment(token!)).toEqual({ ok: false, error: "This link is invalid or has already been used" });
    expect(await claimShipment("not-a-real-token-xxxxxxxxxxxx")).toEqual({
      ok: false,
      error: "This link is invalid or has already been used",
    });
  });

  it("requires login to claim", async () => {
    asUser(null);
    expect(await claimShipment("whatever-token-xxxxxxxxxxxxxx")).toEqual({ ok: false, error: "Please log in" });
  });

  it("sets and clears schedule dates", async () => {
    const res = await createAdminOrder(order());
    if (!res.ok) throw new Error(res.error);
    const id = res.data.shipmentId;
    expect((await updateShipmentSchedule({ shipmentId: id, departureDate: "2026-11-01", estimatedArrival: "2026-11-05" })).ok).toBe(
      true,
    );
    let s = await db.shipment.findUniqueOrThrow({ where: { id } });
    expect(s.estimatedArrival?.toISOString()).toBe("2026-11-05T12:00:00.000Z");
    expect((await updateShipmentSchedule({ shipmentId: id, departureDate: "2026-11-06", estimatedArrival: "2026-11-05" })).ok).toBe(
      false,
    );
    expect(
      (
        await updateShipmentSchedule({
          shipmentId: id,
          departureDate: "2026-11-01",
          estimatedArrival: "2026-11-05",
          estimatedDelivery: "2026-11-06",
        })
      ).ok,
    ).toBe(true);
    s = await db.shipment.findUniqueOrThrow({ where: { id } });
    expect(s.estimatedDelivery?.toISOString()).toBe("2026-11-06T12:00:00.000Z");
    expect(
      (
        await updateShipmentSchedule({
          shipmentId: id,
          departureDate: "2026-11-01",
          estimatedArrival: "2026-11-05",
          estimatedDelivery: "2026-11-04",
        })
      ).ok,
    ).toBe(false);
    await updateShipmentSchedule({ shipmentId: id, departureDate: null, estimatedArrival: null, estimatedDelivery: null });
    s = await db.shipment.findUniqueOrThrow({ where: { id } });
    expect(s.departureDate).toBeNull();
    expect(s.estimatedDelivery).toBeNull();
  });

  it("suggests a parcel price from the rate table", async () => {
    const res = await suggestAdminOrderPrice({
      serviceType: "PARCEL",
      sender: nycAddress,
      recipient: parisAddress,
      packages: [{ weightKg: 3, lengthCm: 20, widthCm: 20, heightCm: 20, qty: 1 }],
    });
    expect(res).toMatchObject({ ok: true, data: { priceCents: expect.any(Number) } });
  });

  it("refuses all order actions for customers", async () => {
    asUser(await makeUser("cust@example.com"));
    for (const res of [
      await createAdminOrder(order()),
      await updateShipmentSchedule({ shipmentId: "x", departureDate: null, estimatedArrival: null }),
      await suggestAdminOrderPrice({ serviceType: "PARCEL", sender: nycAddress, recipient: parisAddress, packages: [] }),
    ]) {
      expect(res).toEqual({ ok: false, error: "Not authorized" });
    }
  });
});
