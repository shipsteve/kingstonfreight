"use client";

import { useState } from "react";
import { Copy, Check, Share2, Printer, MessageCircle, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { site } from "@/lib/site";
import { cn } from "cn";

export function TrackingQuickActions({ trackingNumber }: { trackingNumber: string }) {
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedNum(true);
      toast.success("Tracking number copied to clipboard");
      setTimeout(() => setCopiedNum(false), 2000);
    } catch {
      toast.error("Failed to copy tracking number");
    }
  };

  const handleShareLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : `https://kingstonfreight.com/track/${trackingNumber}`;
      if (navigator.share) {
        await navigator.share({
          title: `Shipment Tracking - ${trackingNumber}`,
          text: `Track shipment ${trackingNumber} on ${site.name}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success("Tracking link copied to clipboard");
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // User cancelled share dialog or clipboard error
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const whatsappUrl = `https://wa.me/18769735898?text=${encodeURIComponent(
    `Hello ${site.name}, I would like to inquire about shipment ${trackingNumber}.`
  )}`;

  const emailSubject = encodeURIComponent(`Shipment Inquiry: ${trackingNumber}`);
  const emailBody = encodeURIComponent(
    `Hello KingstonFreight Support,\n\nI am contacting you regarding shipment tracking number: ${trackingNumber}.\n\nPlease provide an update on this consignment.\n\nThank you.`
  );
  const emailUrl = `mailto:admin@kingstonfreight.com?subject=${emailSubject}&body=${emailBody}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyNumber}
          className="gap-1.5 font-mono text-xs"
        >
          {copiedNum ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          {copiedNum ? "Copied #" : "Copy Number"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleShareLink}
          className="gap-1.5 text-xs"
        >
          {copiedLink ? <Check className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
          {copiedLink ? "Link Copied" : "Share Tracking"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-1.5 text-xs"
        >
          <Printer className="size-3.5" />
          Print Summary
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">Need assistance?</span>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-xs hover:bg-emerald-500/10 hover:text-emerald-600"
          )}
        >
          <MessageCircle className="size-3.5 text-emerald-600" />
          WhatsApp
        </a>
        <a
          href={emailUrl}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-xs")}
        >
          <Mail className="size-3.5" />
          Support
        </a>
      </div>
    </div>
  );
}
