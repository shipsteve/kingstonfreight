"use client";

import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dollarsToCents } from "@/lib/money";
import { approveTopUp, recheckTopUp, rejectTopUp } from "@/server/actions/admin-funding";

export function TopUpReview({
  topUpId,
  defaultCreditCents,
  explorerUrl,
}: {
  topUpId: string;
  defaultCreditCents: number;
  explorerUrl: string;
}) {
  const router = useRouter();
  const [credit, setCredit] = useState((defaultCreditCents / 100).toFixed(2));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Something went wrong");
      toast.success(success);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          Open in explorer <ExternalLink className="size-3.5" />
        </a>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => recheckTopUp(topUpId), "Re-checked")}
        >
          <RefreshCw /> Re-check
        </Button>
      </div>
      <Field>
        <FieldLabel htmlFor={`credit-${topUpId}`}>Credit (USD)</FieldLabel>
        <Input
          id={`credit-${topUpId}`}
          inputMode="decimal"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`note-${topUpId}`}>Reason (required to reject)</FieldLabel>
        <Input id={`note-${topUpId}`} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            const cents = dollarsToCents(credit);
            if (!cents) return setError("Enter the USD amount to credit");
            run(() => approveTopUp({ topUpId, creditedCents: cents }), "Approved and credited");
          }}
        >
          {pending && <Loader2 className="animate-spin" />}
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (!note.trim()) return setError("Add a reason so the customer knows what happened");
            run(() => rejectTopUp({ topUpId, note }), "Rejected");
          }}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
