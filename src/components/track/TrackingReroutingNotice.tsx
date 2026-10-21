"use client";

import { AlertTriangle, ArrowRightLeft, DollarSign, MapPin, Mail } from "lucide-react";

function formatReroutingFee(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function TrackingReroutingNotice({
  trackingNumber,
  reroutingFeeCents,
  reroutingAddress,
}: {
  trackingNumber: string;
  reroutingFeeCents: number | null;
  reroutingAddress: string | null;
}) {
  const emailSubject = encodeURIComponent(`Address Correction & Reroute Request - Waybill ${trackingNumber}`);
  const emailBody = encodeURIComponent(
    `Hello KingstonFreight Dispatch Support,\n\nI am contacting you regarding my paused shipment (Waybill: ${trackingNumber}).\n\nPlease confirm the payment instructions for the rerouting charge and let me know when the updated delivery address details will be available.\n\nThank you.`
  );
  const emailUrl = `mailto:admin@kingstonfreight.com?subject=${emailSubject}&body=${emailBody}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-background p-6 shadow-sm sm:p-8"
      data-testid="tracking-rerouting-notice"
    >
      {/* Top Header Pill & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">
              Consignment Paused · Address Rerouting in Progress
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Waybill: {trackingNumber}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          Status: Rerouting
        </span>
      </div>

      {/* Main Grid: Wrong Address Details & Additional Cost Notice */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Left Column: Address Correction / Pause Info */}
        <div className="flex gap-4 rounded-xl border border-border/80 bg-card/60 p-4 sm:p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowRightLeft className="size-5" />
          </div>
          <div className="space-y-1.5 text-sm">
            <h3 className="font-semibold text-foreground">Delivery Paused for Address Correction</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This shipment was flagged with an <strong>incorrect destination address</strong> upon terminal scan.
              The new rerouting destination is{" "}
              <strong>{reroutingAddress ?? "shown in the latest tracking update"}</strong>.
            </p>
            <div className="pt-2 flex items-center gap-1.5 font-mono text-[11px] text-amber-700 dark:text-amber-300">
              <MapPin className="size-3.5" />
              <span>Consignment safely held at transit hub</span>
            </div>
          </div>
        </div>

        {/* Right Column: Additional Cost Advisory */}
        <div className="flex gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
            <DollarSign className="size-5" />
          </div>
          <div className="space-y-1.5 text-sm">
            <h3 className="font-semibold text-foreground">Additional Rerouting Cost Notice</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Additional rerouting charge:{" "}
              <strong>
                {reroutingFeeCents == null ? "See latest tracking update" : formatReroutingFee(reroutingFeeCents)}
              </strong>
              .
              Payment is required before dispatch. The item will be sent out after payment.
            </p>
            <div className="pt-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span>Payment will be settled before final carrier handoff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Support / Dispatch Contact Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          <span>Need to verify or amend the delivery address? KingstonFreight 24/7 port dispatch is standing by.</span>
        </div>
        <a
          href={emailUrl}
          className="font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Contact Dispatch Support via Email →
        </a>
      </div>
    </div>
  );
}
