"use server";

import { db } from "../db";
import { fail, ok, type ActionResult } from "../result";
import { requireUser } from "../session";
import { hashClaimToken } from "../shipments";
import { guarded } from "./guard";

const INVALID = "This link is invalid or has already been used";

/** Adds an admin-created order to the signed-in account using the one-time link from the order email. */
export async function claimShipment(token: string): Promise<ActionResult<{ shipmentId: string }>> {
  return guarded(async () => {
    const user = await requireUser();
    if (typeof token !== "string" || token.length < 20) return fail(INVALID);
    const hash = hashClaimToken(token);
    const shipment = await db.shipment.findUnique({ where: { claimTokenHash: hash }, select: { id: true } });
    if (!shipment) return fail(INVALID);
    const { count } = await db.shipment.updateMany({
      where: { id: shipment.id, claimTokenHash: hash, userId: null },
      data: { userId: user.id, claimTokenHash: null },
    });
    if (count !== 1) return fail(INVALID);
    return ok({ shipmentId: shipment.id });
  });
}
