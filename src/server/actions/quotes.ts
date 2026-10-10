"use server";

import { config } from "@/lib/config";
import { priceCourier } from "@/lib/pricing/courier";
import { PRICE_FAIL_MESSAGES } from "@/lib/pricing/messages";
import { priceParcel } from "@/lib/pricing/parcel";
import type { PriceResult } from "@/lib/pricing/types";
import { quoteInputSchema, type ParsedQuoteInput, type QuoteInput } from "@/lib/quote-schema";
import { clientIp } from "../client-ip";
import { db } from "../db";
import { fail, ok, type ActionResult } from "../result";
import { rateLimit } from "../rate-limit";
import { loadPricingContext } from "../rates";
import { getCurrentUser, requireUser } from "../session";
import { guarded } from "./guard";

async function priceInput(input: ParsedQuoteInput): Promise<PriceResult | null> {
  if (input.serviceType === "FREIGHT") return null;
  const ctx = await loadPricingContext();
  if (input.serviceType === "COURIER") return priceCourier(input, ctx.courier, config.homeCountry);
  return priceParcel(input, { zones: ctx.zones, rates: ctx.rates, homeCountry: config.homeCountry });
}

export async function calculatePrice(input: QuoteInput): Promise<ActionResult<PriceResult>> {
  if (!rateLimit(`price:${await clientIp()}`, 60, 60_000)) return fail("Too many requests. Please wait a minute and try again.");
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const price = await priceInput(parsed.data);
  if (!price) return fail("Freight is priced manually");
  return ok(price);
}

export async function createQuote(input: QuoteInput): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const user = await requireUser();
    const parsed = quoteInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const data = parsed.data;

    const base = {
      userId: user.id,
      serviceType: data.serviceType,
      origin: data.origin,
      destination: data.destination,
      packages: "packages" in data ? data.packages : [],
      distanceKm: "distanceKm" in data ? data.distanceKm : null,
      freightDetails: "freightDetails" in data ? data.freightDetails : undefined,
    };

    const price = await priceInput(data);
    if (!price) {
      const quote = await db.quote.create({ data: { ...base, status: "PENDING_REVIEW" } });
      return ok({ id: quote.id });
    }
    if (!price.ok) return fail(PRICE_FAIL_MESSAGES[price.reason]);

    const expiresAt = new Date(Date.now() + config.quoteValidityDays * 86_400_000);
    const quote = await db.quote.create({
      data: { ...base, status: "PRICED", priceCents: price.priceCents, expiresAt },
    });
    return ok({ id: quote.id });
  });
}

export async function getMyQuote(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return db.quote.findFirst({ where: { id, userId: user.id }, include: { shipment: true } });
}
