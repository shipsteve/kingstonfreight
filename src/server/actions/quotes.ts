"use server";

import { quoteInputSchema, type QuoteInput } from "@/lib/quote-schema";
import { db } from "../db";
import { sendEmail } from "../email";
import { quoteReceivedEmail } from "../email-templates";
import { fail, ok, type ActionResult } from "../result";
import { getCurrentUser, requireUser } from "../session";
import { guarded } from "./guard";

/** Every request is priced by staff: it is stored without a price and the customer is told we're on it. */
export async function createQuote(input: QuoteInput): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const user = await requireUser();
    const parsed = quoteInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const data = parsed.data;

    const quote = await db.quote.create({
      data: {
        userId: user.id,
        serviceType: data.serviceType,
        origin: data.origin,
        destination: data.destination,
        packages: "packages" in data ? data.packages : [],
        distanceKm: "distanceKm" in data ? data.distanceKm : null,
        freightDetails: "freightDetails" in data ? data.freightDetails : undefined,
        status: "PENDING_REVIEW",
      },
    });
    await sendEmail({ to: user.email, ...quoteReceivedEmail({ id: quote.id }) });
    return ok({ id: quote.id });
  });
}

export async function getMyQuote(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return db.quote.findFirst({ where: { id, userId: user.id }, include: { shipment: true } });
}
