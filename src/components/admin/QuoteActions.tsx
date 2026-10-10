"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dollarsToCents } from "@/lib/money";
import { declineQuote, priceQuote } from "@/server/actions/admin-quotes";

export function QuoteActions({ quoteId, suggestedCents }: { quoteId: string; suggestedCents: number | null }) {
  const router = useRouter();
  const [price, setPrice] = useState(suggestedCents != null ? (suggestedCents / 100).toFixed(2) : "");
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
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = dollarsToCents(price);
        if (!cents) return setError("Enter a price like 1250 or 1250.00");
        run(() => priceQuote({ quoteId, priceCents: cents, note }), "Quote priced and customer emailed");
      }}
    >
      <Field>
        <FieldLabel htmlFor={`price-${quoteId}`}>Price (USD)</FieldLabel>
        <Input id={`price-${quoteId}`} inputMode="decimal" placeholder="1250.00" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`note-${quoteId}`}>Note to customer</FieldLabel>
        <Textarea id={`note-${quoteId}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Send price
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (!note.trim()) return setError("Add a note explaining why you're declining");
            run(() => declineQuote({ quoteId, note }), "Quote declined");
          }}
        >
          Decline
        </Button>
      </div>
    </form>
  );
}
