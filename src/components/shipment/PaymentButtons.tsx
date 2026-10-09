"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptQuote, startPayment } from "@/server/actions/booking";

export function AcceptQuoteButton({ quoteId, byCard }: { quoteId: string; byCard: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await acceptQuote(quoteId);
            if (!res.ok) return setError(res.error);
            if (res.data.checkoutUrl) window.location.assign(res.data.checkoutUrl);
            else router.push(`/shipments/${res.data.shipmentId}`);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        {byCard ? "Accept & pay" : "Accept quote"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function PayNowButton({ shipmentId }: { shipmentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startPayment(shipmentId);
            if (!res.ok) setError(res.error);
            else window.location.assign(res.data.checkoutUrl);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        Pay now
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
