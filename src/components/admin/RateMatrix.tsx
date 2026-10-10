"use client";

import type { ParcelRate, Zone } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dollarsToCents } from "@/lib/money";
import { deleteParcelRate, upsertParcelRate } from "@/server/actions/admin-pricing";

function RateCell({
  originZoneId,
  destZoneId,
  maxWeightKg,
  rate,
}: {
  originZoneId: string;
  destZoneId: string;
  maxWeightKg: number;
  rate?: ParcelRate;
}) {
  const router = useRouter();
  const initial = rate ? (rate.priceCents / 100).toFixed(2) : "";
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();

  const commit = () => {
    if (value === initial) return;
    start(async () => {
      if (value.trim() === "") {
        if (!rate) return;
        const res = await deleteParcelRate(rate.id);
        if (!res.ok) toast.error(res.error);
        router.refresh();
        return;
      }
      const cents = dollarsToCents(value);
      if (cents === null) {
        toast.error("Enter a price like 12.50");
        setValue(initial);
        return;
      }
      const res = await upsertParcelRate({ originZoneId, destZoneId, maxWeightKg, priceCents: cents });
      if (!res.ok) {
        toast.error(res.error);
        setValue(initial);
      } else router.refresh();
    });
  };

  return (
    <Input
      aria-label={`Price up to ${maxWeightKg} kg`}
      inputMode="decimal"
      className="h-8 w-24 text-right tabular-nums"
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}

function OriginTable({ origin, zones, rates }: { origin: Zone; zones: Zone[]; rates: ParcelRate[] }) {
  const mine = rates.filter((r) => r.originZoneId === origin.id);
  const [extraBands, setExtraBands] = useState<number[]>([]);
  const [newBand, setNewBand] = useState("");
  const bands = [...new Set([...mine.map((r) => r.maxWeightKg), ...extraBands])].sort((a, b) => a - b);

  return (
    <details className="group rounded-lg border" open={false}>
      <summary className="cursor-pointer px-4 py-3 font-medium select-none">
        From {origin.name} <span className="text-sm font-normal text-muted-foreground">({mine.length} rates)</span>
      </summary>
      <div className="overflow-x-auto px-4 pb-4">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-4 text-left font-medium">Up to</th>
              {zones.map((z) => (
                <th key={z.id} className="px-1 py-2 text-right font-medium whitespace-nowrap">
                  → {z.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bands.map((kg) => (
              <tr key={kg}>
                <td className="py-1 pr-4 whitespace-nowrap tabular-nums">{kg} kg</td>
                {zones.map((z) => (
                  <td key={z.id} className="px-1 py-1">
                    <RateCell
                      originZoneId={origin.id}
                      destZoneId={z.id}
                      maxWeightKg={kg}
                      rate={mine.find((r) => r.destZoneId === z.id && r.maxWeightKg === kg)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const kg = Number(newBand);
            if (kg > 0) setExtraBands((b) => [...b, kg]);
            setNewBand("");
          }}
        >
          <Input
            aria-label="New weight band in kg"
            placeholder="New band, kg"
            inputMode="decimal"
            className="h-8 w-32"
            value={newBand}
            onChange={(e) => setNewBand(e.target.value)}
          />
          <Button type="submit" size="sm" variant="outline">
            Add band
          </Button>
        </form>
      </div>
    </details>
  );
}

export function RateMatrix({ zones, rates }: { zones: Zone[]; rates: ParcelRate[] }) {
  if (zones.length === 0) return <p className="text-sm text-muted-foreground">Add a zone first.</p>;
  return (
    <div className="space-y-3">
      {zones.map((z) => (
        <OriginTable key={z.id} origin={z} zones={zones} rates={rates} />
      ))}
    </div>
  );
}
