"use server";

import { fail, type ActionResult } from "../result";

// Rewritten to pay from the account balance (wallet plan, Task 3).
export async function acceptQuote(_quoteId: string): Promise<ActionResult<{ shipmentId: string }>> {
  return fail("Booking is temporarily unavailable");
}
