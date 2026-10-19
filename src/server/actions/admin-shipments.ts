"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canTransition } from "@/lib/tracking/status";
import { refundShipment } from "../ledger";
import { db } from "../db";
import { sendEmail } from "../email";
import { statusChangedEmail } from "../email-templates";
import { fail, ok, type ActionResult } from "../result";
import { requireAdmin } from "../session";
import { guarded } from "./guard";
import { safeRevalidate } from "./revalidate";

const STATUSES = [
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "CUSTOMS",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
  "REROUTING",
] as const;

const statusSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum(STATUSES),
  location: z.string().trim().min(1, "Location is required").max(200),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: z.string().trim().max(2000).optional(),
  lat: z.number().finite().min(-90).max(90).optional(),
  lng: z.number().finite().min(-180).max(180).optional(),
}).refine((v) => (v.lat === undefined) === (v.lng === undefined), "Enter both latitude and longitude");

export async function updateShipmentStatus(input: z.input<typeof statusSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = statusSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { shipmentId, status, location, countryCode, note, lat, lng } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({ where: { id: shipmentId }, include: { user: true } });
      if (!shipment) return { error: "Not found" } as const;
      if (shipment.status !== status && !canTransition(shipment.status, status)) {
        return { error: `Cannot move from ${shipment.status} to ${status}` } as const;
      }
      // Guard against a concurrent change between the read and the write.
      const { count } = await tx.shipment.updateMany({
        where: { id: shipmentId, status: shipment.status },
        data: { status },
      });
      if (count !== 1) return { error: "Shipment changed meanwhile; reload and try again" } as const;
      if (status === "CANCELLED" && shipment.status !== "CANCELLED") await refundShipment(tx, shipmentId);
      const event = await tx.trackingEvent.create({
        data: { shipmentId, status, location, countryCode: countryCode ?? null, note: note || null,
          lat: lat ?? null, lng: lng ?? null, confirmedAt: new Date() },
      });
      return { shipment, event } as const;
    });
    if ("error" in result) return fail(result.error!);

    const to = result.shipment.user?.email ?? result.shipment.customerEmail;
    if (to) await sendEmail({ to, ...statusChangedEmail(result.shipment, result.event) });
    safeRevalidate(revalidatePath, `/admin/shipments/${shipmentId}`);
    safeRevalidate(revalidatePath, `/track/${result.shipment.trackingNumber}`);
    safeRevalidate(revalidatePath, `/shipments/${shipmentId}`);
    return ok({ id: shipmentId });
  });
}

const paymentSchema = z.object({ shipmentId: z.string().min(1), paymentStatus: z.enum(["PAID", "UNPAID"]) });

export async function setPaymentStatus(input: z.input<typeof paymentSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const shipment = await db.shipment.findUnique({ where: { id: parsed.data.shipmentId } });
    if (!shipment) return fail("Not found");
    if (shipment.paymentMethod === "BALANCE") return fail("Payment for balance bookings is managed by the ledger");
    await db.shipment.update({ where: { id: shipment.id }, data: { paymentStatus: parsed.data.paymentStatus } });
    safeRevalidate(revalidatePath, `/admin/shipments/${parsed.data.shipmentId}`);
    return ok({ id: parsed.data.shipmentId });
  });
}
