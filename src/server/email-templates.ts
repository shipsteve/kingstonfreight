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

export function quoteReceivedEmail(q: { id: string }) {
  return {
    subject: "We've received your quote request",
    html: layout(
      "We've received your quote request",
      "<p>Our team will price your shipment and email you, usually within one business day.</p>",
      { href: `${appUrl()}/quotes/${q.id}`, label: "View request" },
    ),
  };
}

export function quoteReadyEmail(q: { id: string; priceCents: number; adminNote?: string | null }) {
  const note = q.adminNote ? `<p>Note from our team: ${esc(q.adminNote)}</p>` : "";
  return {
    subject: `Your quote is ready: ${formatMoney(q.priceCents)}`,
    html: layout(
      "Your quote is ready",
      `<p>We've priced your shipment at <strong>${formatMoney(q.priceCents)}</strong>. The quote is valid for 7 days and is paid from your account balance when you accept it.</p>${note}`,
      { href: `${appUrl()}/quotes/${q.id}`, label: "Review and accept" },
    ),
  };
}

export function bookingConfirmedEmail(s: {
  id: string;
  trackingNumber: string;
  priceCents: number;
  paymentMethod: "BALANCE" | "COUNTER";
}) {
  const payment =
    s.paymentMethod === "BALANCE"
      ? `<p>${formatMoney(s.priceCents)} has been paid from your account balance.</p>`
      : "<p>Paid at our counter.</p>";
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

export function topUpReceivedEmail(t: { coin: string; amountCents: number }) {
  return {
    subject: "Payment received — under review",
    html: layout(
      "We've received your payment details",
      `<p>Thanks! We're verifying your ${esc(t.coin)} payment of <strong>${formatMoney(t.amountCents)}</strong>. We'll email you as soon as it's added to your balance.</p>`,
      { href: `${appUrl()}/account/wallet`, label: "View wallet" },
    ),
  };
}

export function topUpApprovedEmail(t: { creditedCents: number; balanceCents: number }) {
  return {
    subject: `Funds added: ${formatMoney(t.creditedCents)}`,
    html: layout(
      "Funds added to your balance",
      `<p>We've added <strong>${formatMoney(t.creditedCents)}</strong>. Your balance is now ${formatMoney(t.balanceCents)}.</p>`,
      { href: `${appUrl()}/account/wallet`, label: "View wallet" },
    ),
  };
}

export function topUpRejectedEmail(t: { coin: string; amountCents: number; note: string }) {
  return {
    subject: "We couldn't verify your payment",
    html: layout(
      "We couldn't verify your payment",
      `<p>Your ${esc(t.coin)} top-up of ${formatMoney(t.amountCents)} wasn't added.</p><p>Reason: ${esc(t.note)}</p><p>Reply to this email if you think this is a mistake.</p>`,
      { href: `${appUrl()}/account/wallet`, label: "View wallet" },
    ),
  };
}

export function accountApprovedEmail() {
  return {
    subject: "Your account is approved",
    html: layout(
      "Your account is approved",
      "<p>You can now book shipments. Prices are paid from your account balance.</p>",
      { href: `${appUrl()}/quote`, label: "Request a quote" },
    ),
  };
}
