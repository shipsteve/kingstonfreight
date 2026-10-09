import { formatMoney } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import type { ShipmentStatus } from "@prisma/client";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta?: { href: string; label: string }) {
  const button = cta
    ? `<p><a href="${esc(cta.href)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${esc(cta.label)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;line-height:1.5"><h2>${esc(title)}</h2>${body}${button}</div>`;
}

export function quoteReadyEmail(q: { id: string; priceCents: number; adminNote?: string | null }) {
  const note = q.adminNote ? `<p>Note from our team: ${esc(q.adminNote)}</p>` : "";
  return {
    subject: `Your freight quote is ready: ${formatMoney(q.priceCents)}`,
    html: layout(
      "Your freight quote is ready",
      `<p>We've priced your freight request at <strong>${formatMoney(q.priceCents)}</strong>. The quote is valid for 7 days.</p>${note}`,
      { href: `${appUrl()}/quotes/${q.id}`, label: "Review and accept" },
    ),
  };
}

export function bookingConfirmedEmail(s: { id: string; trackingNumber: string; paymentMethod: "CARD" | "INVOICE" }) {
  const payment =
    s.paymentMethod === "INVOICE"
      ? "<p>We'll send you an invoice separately.</p>"
      : "<p>Your payment has been received.</p>";
  return {
    subject: `Booking confirmed: ${s.trackingNumber}`,
    html: layout(
      "Your shipment is booked",
      `<p>Tracking number: <strong>${esc(s.trackingNumber)}</strong></p>${payment}`,
      { href: `${appUrl()}/track/${s.trackingNumber}`, label: "Track shipment" },
    ),
  };
}

export function statusChangedEmail(
  s: { trackingNumber: string },
  event: { status: ShipmentStatus; location: string; note?: string | null },
) {
  const label = STATUS_LABELS[event.status];
  const note = event.note ? `<p>${esc(event.note)}</p>` : "";
  return {
    subject: `${s.trackingNumber}: ${label}`,
    html: layout(
      label,
      `<p>Shipment <strong>${esc(s.trackingNumber)}</strong> is now <strong>${esc(label.toLowerCase())}</strong> (${esc(event.location)}).</p>${note}`,
      { href: `${appUrl()}/track/${s.trackingNumber}`, label: "Track shipment" },
    ),
  };
}
