"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { claimShipment } from "@/server/actions/claim";

export function ClaimButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await claimShipment(token);
            if (!res.ok) return setError(res.error);
            router.push(`/shipments/${res.data.shipmentId}`);
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        Add to my account
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
