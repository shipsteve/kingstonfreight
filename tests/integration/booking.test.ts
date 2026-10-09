import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { acceptQuote, startPayment } from "@/server/actions/booking";
import { sendEmail } from "@/server/email";
import { completeCheckout } from "@/server/shipments";
import { createCheckoutSession } from "@/server/stripe";
import { makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/stripe", () => ({
  createCheckoutSession: vi.fn(async ({ shipmentId }: { shipmentId: string }) => ({
    id: `cs_test_${shipmentId}`,
    url: `https://checkout.stripe.test/${shipmentId}`,
  })),
}));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));

const DAY = 86_400_000;

async function makeQuote(
  userId: string,
  over: Partial<{ serviceType: "PARCEL" | "COURIER" | "FREIGHT"; status: "PRICED" | "PENDING_REVIEW"; expiresAt: Date; priceCents: number | null }> = {},
) {
  return db.quote.create({
    data: {
      userId,
      serviceType: over.serviceType ?? "PARCEL",
      origin: nycAddress,
      destination: parisAddress,
      packages: smallBox,
      status: over.status ?? "PRICED",
      priceCents: over.priceCents === undefined ? 4300 : over.priceCents,
      expiresAt: over.expiresAt ?? new Date(Date.now() + 7 * DAY),
    },
  });
}

describe("acceptQuote", () => {
  let ann: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    ann = await makeUser("ann@example.com");
    asUser(ann);
  });

  it("books a parcel quote as AWAITING_PAYMENT and returns a checkout url", async () => {
    const quote = await makeQuote(ann.id);
    const res = await acceptQuote(quote.id);
    if (!res.ok) throw new Error(res.error);
    expect(res.data.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.test\//);

    const shipment = await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } });
    expect(shipment).toMatchObject({
      status: "AWAITING_PAYMENT",
      paymentMethod: "CARD",
      paymentStatus: "UNPAID",
      priceCents: 4300,
      userId: ann.id,
      serviceType: "PARCEL",
    });
    expect(shipment.trackingNumber).toMatch(/^SHP-/);
    expect(shipment.stripeSessionId).toBe(`cs_test_${shipment.id}`);
    expect((await db.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("ACCEPTED");
    expect(vi.mocked(createCheckoutSession)).toHaveBeenCalledWith(
      expect.objectContaining({ priceCents: 4300, customerEmail: "ann@example.com" }),
    );
  });

  it("books a priced freight quote as BOOKED on invoice and emails confirmation", async () => {
    const quote = await makeQuote(ann.id, { serviceType: "FREIGHT", priceCents: 125000 });
    const res = await acceptQuote(quote.id);
    if (!res.ok) throw new Error(res.error);
    expect(res.data.checkoutUrl).toBeNull();

    const shipment = await db.shipment.findUniqueOrThrow({
      where: { id: res.data.shipmentId },
      include: { events: true },
    });
    expect(shipment).toMatchObject({ status: "BOOKED", paymentMethod: "INVOICE", paymentStatus: "UNPAID" });
    expect(shipment.events.map((e) => e.status)).toEqual(["BOOKED"]);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createCheckoutSession)).not.toHaveBeenCalled();
  });

  it("creates exactly one shipment when accepted twice in a row", async () => {
    const quote = await makeQuote(ann.id);
    expect((await acceptQuote(quote.id)).ok).toBe(true);
    expect(await acceptQuote(quote.id)).toEqual({ ok: false, error: "Quote already accepted" });
    expect(await db.shipment.count()).toBe(1);
  });

  it("creates exactly one shipment when accepted twice concurrently", async () => {
    const quote = await makeQuote(ann.id);
    const results = await Promise.all([acceptQuote(quote.id), acceptQuote(quote.id)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.shipment.count()).toBe(1);
  });

  it("rejects an expired quote and marks it EXPIRED", async () => {
    const quote = await makeQuote(ann.id, { expiresAt: new Date(Date.now() - 1000) });
    expect(await acceptQuote(quote.id)).toEqual({ ok: false, error: "Quote has expired" });
    expect((await db.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("EXPIRED");
    expect(await db.shipment.count()).toBe(0);
  });

  it("rejects a quote that has not been priced", async () => {
    const quote = await makeQuote(ann.id, { serviceType: "FREIGHT", status: "PENDING_REVIEW", priceCents: null });
    const res = await acceptQuote(quote.id);
    expect(res.ok).toBe(false);
    expect(await db.shipment.count()).toBe(0);
  });

  it("treats another customer's quote as not found", async () => {
    const quote = await makeQuote(ann.id);
    asUser(await makeUser("bob@example.com"));
    expect(await acceptQuote(quote.id)).toEqual({ ok: false, error: "Not found" });
    expect(await db.shipment.count()).toBe(0);
  });

  it("requires login", async () => {
    const quote = await makeQuote(ann.id);
    asUser(null);
    expect(await acceptQuote(quote.id)).toEqual({ ok: false, error: "Please log in" });
  });
});

describe("completeCheckout", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  async function awaitingShipment() {
    const ann = await makeUser("ann@example.com");
    asUser(ann);
    const quote = await makeQuote(ann.id);
    const res = await acceptQuote(quote.id);
    if (!res.ok) throw new Error(res.error);
    return db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } });
  }

  it("marks the shipment PAID and BOOKED with one event and one email", async () => {
    const s = await awaitingShipment();
    expect(await completeCheckout(s.stripeSessionId!, s.id)).toBe("updated");
    const after = await db.shipment.findUniqueOrThrow({ where: { id: s.id }, include: { events: true } });
    expect(after).toMatchObject({ paymentStatus: "PAID", status: "BOOKED" });
    expect(after.events).toHaveLength(1);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the same webhook arrives twice", async () => {
    const s = await awaitingShipment();
    await completeCheckout(s.stripeSessionId!, s.id);
    expect(await completeCheckout(s.stripeSessionId!, s.id)).toBe("noop");
    expect(await db.trackingEvent.count({ where: { shipmentId: s.id } })).toBe(1);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("still records the payment if an admin already moved the shipment on", async () => {
    const s = await awaitingShipment();
    await db.shipment.update({ where: { id: s.id }, data: { status: "PICKED_UP" } });
    expect(await completeCheckout(s.stripeSessionId!, s.id)).toBe("updated");
    const after = await db.shipment.findUniqueOrThrow({ where: { id: s.id } });
    expect(after).toMatchObject({ paymentStatus: "PAID", status: "PICKED_UP" });
    expect(await db.trackingEvent.count({ where: { shipmentId: s.id } })).toBe(0);
  });

  it("ignores an unknown shipment id", async () => {
    expect(await completeCheckout("cs_x", "missing")).toBe("noop");
  });
});

describe("startPayment", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("creates a fresh checkout session for an unpaid card shipment", async () => {
    const ann = await makeUser("ann@example.com");
    asUser(ann);
    const quote = await makeQuote(ann.id);
    const booked = await acceptQuote(quote.id);
    if (!booked.ok) throw new Error(booked.error);
    const res = await startPayment(booked.data.shipmentId);
    expect(res).toMatchObject({ ok: true, data: { checkoutUrl: expect.stringContaining("checkout.stripe.test") } });
  });

  it("refuses to take payment twice", async () => {
    const ann = await makeUser("ann@example.com");
    asUser(ann);
    const quote = await makeQuote(ann.id);
    const booked = await acceptQuote(quote.id);
    if (!booked.ok) throw new Error(booked.error);
    const s = await db.shipment.findUniqueOrThrow({ where: { id: booked.data.shipmentId } });
    await completeCheckout(s.stripeSessionId!, s.id);
    expect(await startPayment(s.id)).toEqual({ ok: false, error: "This shipment is already paid" });
  });
});
