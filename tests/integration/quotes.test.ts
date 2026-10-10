import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email";
import { createQuote, getMyQuote } from "@/server/actions/quotes";
import * as quoteActions from "@/server/actions/quotes";
import { seed } from "../../prisma/seed";
import { laAddress, makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));

const parcelInput = { serviceType: "PARCEL" as const, origin: nycAddress, destination: parisAddress, packages: smallBox };
const courierInput = { serviceType: "COURIER" as const, origin: nycAddress, destination: laAddress, distanceKm: 12 };
const freightInput = {
  serviceType: "FREIGHT" as const,
  origin: nycAddress,
  destination: parisAddress,
  packages: [{ weightKg: 800, lengthCm: 120, widthCm: 100, heightCm: 150, qty: 2 }],
  freightDetails: { mode: "SEA" as const, cargoType: "Pallets", description: "Machine parts" },
};

describe("quotes (staff-priced)", () => {
  beforeEach(async () => {
    await resetDb();
    await seed(db);
    vi.clearAllMocks();
    asUser(null);
  });

  it("no longer exposes a public instant-price action", () => {
    expect("calculatePrice" in quoteActions).toBe(false);
  });

  it("requires login to submit a quote request", async () => {
    expect(await createQuote(parcelInput)).toEqual({ ok: false, error: "Please log in" });
  });

  it.each([
    ["parcel", parcelInput],
    ["courier", courierInput],
    ["freight", freightInput],
  ])("saves a %s request as PENDING_REVIEW with no price and emails the customer", async (_label, input) => {
    const user = await makeUser("ann@example.com");
    asUser(user);
    const res = await createQuote(input);
    if (!res.ok) throw new Error(res.error);
    const quote = await db.quote.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(quote).toMatchObject({ status: "PENDING_REVIEW", priceCents: null, expiresAt: null, userId: user.id });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(expect.objectContaining({ to: "ann@example.com" }));
  });

  it("ignores a client-supplied price", async () => {
    asUser(await makeUser("ann@example.com"));
    const res = await createQuote({ ...parcelInput, priceCents: 1 } as never);
    if (!res.ok) throw new Error(res.error);
    expect((await db.quote.findUniqueOrThrow({ where: { id: res.data.id } })).priceCents).toBeNull();
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
