"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { config } from "@/lib/config";
import { db } from "../db";
import { sendEmail } from "../email";
import { quoteReadyEmail } from "../email-templates";
import { fail, ok, type ActionResult } from "../result";
import { requireAdmin } from "../session";
import { guarded } from "./guard";
import { safeRevalidate } from "./revalidate";

const priceSchema = z.object({
  quoteId: z.string().min(1),
  priceCents: z.number().int().positive("Price must be greater than zero"),
  note: z.string().trim().max(2000).optional(),
});

export async function priceFreightQuote(input: z.input<typeof priceSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = priceSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { quoteId, priceCents, note } = parsed.data;

    const expiresAt = new Date(Date.now() + config.quoteValidityDays * 86_400_000);
    const { count } = await db.quote.updateMany({
      where: { id: quoteId, serviceType: "FREIGHT", status: "PENDING_REVIEW" },
      data: { status: "PRICED", priceCents, adminNote: note || null, expiresAt },
    });
    if (count !== 1) return fail("Only freight quotes awaiting review can be priced");

    const quote = await db.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { user: true } });
    if (quote.user) {
      await sendEmail({ to: quote.user.email, ...quoteReadyEmail({ id: quote.id, priceCents, adminNote: quote.adminNote }) });
    }
    safeRevalidate(revalidatePath, "/admin/quotes");
    return ok({ id: quoteId });
  });
}

const declineSchema = z.object({ quoteId: z.string().min(1), note: z.string().trim().min(1, "Add a reason").max(2000) });

export async function declineFreightQuote(input: z.input<typeof declineSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = declineSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { count } = await db.quote.updateMany({
      where: { id: parsed.data.quoteId, serviceType: "FREIGHT", status: "PENDING_REVIEW" },
      data: { status: "DECLINED", adminNote: parsed.data.note },
    });
    if (count !== 1) return fail("Only freight quotes awaiting review can be declined");
    safeRevalidate(revalidatePath, "/admin/quotes");
    return ok({ id: parsed.data.quoteId });
  });
}
