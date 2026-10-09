import type Stripe from "stripe";
import { completeCheckout } from "@/server/shipments";
import { getStripe } from "@/server/stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const shipmentId = session.metadata?.shipmentId;
    if (shipmentId && session.payment_status === "paid") await completeCheckout(session.id, shipmentId);
  }
  return new Response("ok");
}
