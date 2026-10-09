import Stripe from "stripe";
import { config } from "@/lib/config";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  client ??= new Stripe(key);
  return client;
}

export async function createCheckoutSession(args: {
  shipmentId: string;
  trackingNumber: string;
  priceCents: number;
  customerEmail: string;
}): Promise<{ id: string; url: string }> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: args.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: config.currency.toLowerCase(),
          unit_amount: args.priceCents,
          product_data: { name: `Shipment ${args.trackingNumber}` },
        },
      },
    ],
    metadata: { shipmentId: args.shipmentId },
    success_url: `${appUrl}/shipments/${args.shipmentId}?paid=1`,
    cancel_url: `${appUrl}/shipments/${args.shipmentId}`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { id: session.id, url: session.url };
}
