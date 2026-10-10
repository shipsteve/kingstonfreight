"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminOrderSchema, scheduleSchema, type AdminOrderInput } from "@/lib/admin-order-schema";
import { config } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { priceCourier } from "@/lib/pricing/courier";
import { priceParcel } from "@/lib/pricing/parcel";
import { shipmentWeights } from "@/lib/pricing/weight";
import { addressSchema, packageSchema } from "@/lib/quote-schema";
import { absoluteUrl } from "@/lib/receipt";
import { site } from "@/lib/site";
import { db } from "../db";
import { sendEmail } from "../email";
import { orderCreatedEmail } from "../email-templates";
import { debitForShipment, InsufficientBalanceError, lockUser } from "../ledger";
import { loadPricingContext } from "../rates";
import { fail, ok, type ActionResult } from "../result";
import { requireAdmin } from "../session";
import { attachCoordinates, newClaimToken, uniqueTrackingNumber } from "../shipments";
import { guarded } from "./guard";
import { safeRevalidate } from "./revalidate";

class OrderRefused extends Error {}

const claimUrl = (token: string) => absoluteUrl(`/claim/${token}`);

/** Staff-created order (counter/phone). Paid at the counter, or charged to an approved customer's balance. */
export async function createAdminOrder(
  input: AdminOrderInput,
): Promise<ActionResult<{ shipmentId: string; trackingNumber: string }>> {
  return guarded(async () => {
    const admin = await requireAdmin();
    const parsed = adminOrderSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const o = parsed.data;
    const weights = shipmentWeights(o.packages);
    // Only a balance charge links to an account directly (the admin chose that account). Otherwise the
    // order is linked when someone who can read the customer's inbox opens the emailed claim link.
    const customer = o.payment === "BALANCE" ? await db.user.findUnique({ where: { email: o.customerEmail } }) : null;
    const claim = o.payment === "BALANCE" ? null : newClaimToken();

    let shipment;
    try {
      shipment = await db.$transaction(async (tx) => {
        if (o.payment === "BALANCE") {
          if (!customer) throw new OrderRefused("Charging a balance needs an existing approved customer");
          const { accountStatus } = await lockUser(tx, customer.id);
          if (accountStatus !== "APPROVED") throw new OrderRefused("Charging a balance needs an existing approved customer");
        }
        const created = await tx.shipment.create({
          data: {
            userId: customer?.id ?? null,
            customerEmail: o.customerEmail,
            claimTokenHash: claim?.hash ?? null,
            createdById: admin.id,
            trackingNumber: await uniqueTrackingNumber(tx),
            serviceType: o.serviceType,
            status: "BOOKED",
            priceCents: o.priceCents,
            paymentMethod: o.payment,
            paymentStatus: "PAID",
            origin: o.sender,
            destination: o.recipient,
            transportMode: o.transportMode ?? null,
            departurePort: o.departurePort ?? null,
            arrivalPort: o.arrivalPort ?? null,
            departureDate: o.departureDate,
            estimatedArrival: o.estimatedArrival,
            packages: o.packages,
            actualWeightKg: weights.actualKg,
            chargeableWeightKg: weights.chargeableKg,
            contents: o.contents,
            declaredValueCents: o.declaredValueCents,
            goodsOriginCountry: o.goodsOriginCountry ?? null,
            hsCode: o.hsCode ?? null,
            billTo: o.billTo,
            events: { create: { status: "BOOKED", location: `Booked by ${site.name}` } },
          },
        });
        if (o.payment === "BALANCE") {
          await debitForShipment(tx, { userId: customer!.id, shipmentId: created.id, amountCents: o.priceCents });
        }
        return created;
      });
    } catch (e) {
      if (e instanceof OrderRefused) return fail(e.message);
      if (e instanceof InsufficientBalanceError) {
        return fail(`Insufficient balance: the customer needs ${formatMoney(e.shortCents)} more.`);
      }
      throw e;
    }

    await attachCoordinates(shipment.id, o.sender, o.recipient);
    await sendEmail({
      to: o.customerEmail,
      ...orderCreatedEmail(shipment, site.name, claim ? claimUrl(claim.token) : null),
    });
    safeRevalidate(revalidatePath, "/admin/shipments");
    return ok({ shipmentId: shipment.id, trackingNumber: shipment.trackingNumber });
  });
}

export async function updateShipmentSchedule(
  input: z.input<typeof scheduleSchema>,
): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = scheduleSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { shipmentId, departureDate, estimatedArrival } = parsed.data;
    const { count } = await db.shipment.updateMany({
      where: { id: shipmentId },
      data: { departureDate, estimatedArrival },
    });
    if (count !== 1) return fail("Not found");
    safeRevalidate(revalidatePath, `/admin/shipments/${shipmentId}`);
    return ok({ id: shipmentId });
  });
}

const suggestSchema = z.object({
  serviceType: z.enum(["PARCEL", "COURIER", "FREIGHT"]),
  sender: addressSchema,
  recipient: addressSchema,
  packages: z.array(packageSchema),
  distanceKm: z.number().positive().optional(),
});

/** Rate-table hint for the admin order form (parcel/courier only). */
export async function suggestAdminOrderPrice(
  input: z.input<typeof suggestSchema>,
): Promise<ActionResult<{ priceCents: number }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = suggestSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const p = parsed.data;
    const ctx = await loadPricingContext();
    if (p.serviceType === "PARCEL") {
      const res = priceParcel(
        { origin: p.sender, destination: p.recipient, packages: p.packages },
        { zones: ctx.zones, rates: ctx.rates, homeCountry: config.homeCountry },
      );
      return res.ok ? ok({ priceCents: res.priceCents }) : fail("No rate-table price for this route or weight");
    }
    if (p.serviceType === "COURIER" && p.distanceKm) {
      const res = priceCourier({ origin: p.sender, destination: p.recipient, distanceKm: p.distanceKm }, ctx.courier, config.homeCountry);
      return res.ok ? ok({ priceCents: res.priceCents }) : fail("No courier price for this distance");
    }
    return fail("Freight is priced manually");
  });
}
