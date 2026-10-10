"use client";

import type { AccountStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dollarsToCents } from "@/lib/money";
import { adjustBalance, setAccountStatus } from "@/server/actions/admin-funding";

export function CustomerControls({ userId, status, name }: { userId: string; status: AccountStatus; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const changeStatus = (next: "APPROVED" | "SUSPENDED") =>
    start(async () => {
      const res = await setAccountStatus({ userId, status: next });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(next === "SUSPENDED" ? "Account suspended" : "Account approved");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {status !== "APPROVED" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => changeStatus("APPROVED")}>
          {status === "SUSPENDED" ? "Unsuspend" : "Approve"}
        </Button>
      )}
      {status !== "SUSPENDED" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => changeStatus("SUSPENDED")}>
          Suspend
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="ghost" />}>Adjust</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust balance</DialogTitle>
            <DialogDescription>
              For corrections or goodwill credits for {name}. Recorded in their history with your note.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const cents = dollarsToCents(amount);
              if (!cents) return setError("Enter an amount like 25.00");
              start(async () => {
                setError(null);
                const res = await adjustBalance({ userId, amountCents: direction === "credit" ? cents : -cents, note });
                if (!res.ok) return setError(res.error);
                toast.success("Balance adjusted");
                setOpen(false);
                setAmount("");
                setNote("");
                router.refresh();
              });
            }}
          >
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={direction === "credit" ? "default" : "outline"}
                onClick={() => setDirection("credit")}
              >
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant={direction === "debit" ? "default" : "outline"}
                onClick={() => setDirection("debit")}
              >
                Deduct
              </Button>
            </div>
            <Field>
              <FieldLabel htmlFor={`adj-amount-${userId}`}>Amount (USD)</FieldLabel>
              <Input
                id={`adj-amount-${userId}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`adj-note-${userId}`}>Note</FieldLabel>
              <Input id={`adj-note-${userId}`} value={note} onChange={(e) => setNote(e.target.value)} required />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              Save adjustment
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
