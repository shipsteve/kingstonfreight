"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { COIN_NAMES, type CoinCode } from "@/lib/coins";
import { submitTopUp } from "@/server/actions/wallet";
import { cn } from "@/lib/utils";

export type CoinOption = { coin: CoinCode; address: string; qrSvg: string; usdPrice: number | null };

export function AddFundsForm({ coins, minTopUpCents }: { coins: CoinOption[]; minTopUpCents: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<CoinCode>(coins[0]?.coin ?? "BTC");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const option = coins.find((c) => c.coin === selected);
  if (!option) return <p className="text-sm text-muted-foreground">Crypto payments aren&apos;t available right now.</p>;

  const cents = dollarsToCents(amount);
  const coinAmount = cents && option.usdPrice ? (cents / 100 / option.usdPrice).toFixed(8).replace(/0+$/, "") : null;

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Coin" className="inline-flex rounded-lg border p-1">
        {coins.map((c) => (
          <button
            key={c.coin}
            role="tab"
            aria-selected={selected === c.coin}
            onClick={() => setSelected(c.coin)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              selected === c.coin ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {COIN_NAMES[c.coin]} ({c.coin})
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div
          className="mx-auto size-44 rounded-xl border bg-white p-2 sm:mx-0 [&_svg]:size-full"
          aria-label={`QR code for our ${option.coin} address`}
          dangerouslySetInnerHTML={{ __html: option.qrSvg }}
        />
        <div className="min-w-0 space-y-3">
          <p className="text-sm font-medium">1. Send {COIN_NAMES[option.coin]} to this address</p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
            <code className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">{option.address}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={copied ? "Copied" : "Copy address"}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(option.address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // clipboard blocked
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Only send {option.coin} on the {COIN_NAMES[option.coin]} network. Other coins or networks sent here are lost.
            {option.usdPrice && <> 1 {option.coin} ≈ {formatMoney(Math.round(option.usdPrice * 100))}.</>}
          </p>
          {option.coin === "LTC" && (
            <p role="note" className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
              Don&apos;t send Litecoin from a MWEB (confidential/private) address. Those deposits can&apos;t be
              received and will be lost.
            </p>
          )}
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!cents) return setError("Enter the amount you sent in USD, e.g. 75.00");
          start(async () => {
            setError(null);
            const res = await submitTopUp({ coin: option.coin, amountCents: cents, txHash });
            if (!res.ok) return setError(res.error);
            toast.success("Payment submitted. We'll email you once it's verified.");
            setAmount("");
            setTxHash("");
            router.refresh();
          });
        }}
      >
        <p className="text-sm font-medium">2. Tell us about your payment</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="amount">Amount sent (USD)</FieldLabel>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder={(minTopUpCents / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <FieldDescription>
              Minimum {formatMoney(minTopUpCents)}
              {coinAmount && <> · ≈ {coinAmount} {option.coin}</>}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="txHash">Transaction ID</FieldLabel>
            <Input
              id="txHash"
              className="font-mono"
              placeholder="64-character transaction hash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              required
            />
            <FieldDescription>Find it in your wallet app after sending.</FieldDescription>
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Submit payment
        </Button>
      </form>
    </div>
  );
}
