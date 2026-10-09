import { completeCheckout } from "@/server/shipments";

/** E2E only: stands in for the Stripe webhook. 404 unless E2E_TEST_MODE=1. */
export async function POST(req: Request) {
  if (process.env.E2E_TEST_MODE !== "1") return new Response("Not found", { status: 404 });
  const { shipmentId } = (await req.json()) as { shipmentId?: string };
  if (!shipmentId) return new Response("shipmentId required", { status: 400 });
  return Response.json({ result: await completeCheckout(`cs_e2e_${shipmentId}`, shipmentId) });
}
