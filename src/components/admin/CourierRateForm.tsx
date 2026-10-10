"use client";

import type { CourierRate } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dollarsToCents } from "@/lib/money";
import { updateCourierRate } from "@/server/actions/admin-pricing";

export function CourierRateForm({ courier }: { courier: CourierRate | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      className="grid max-w-2xl gap-4 sm:grid-cols-4 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const base = dollarsToCents(String(f.get("base")));
        const perKm = dollarsToCents(String(f.get("perKm")));
        const maxKm = Number(f.get("maxKm"));
        if (base === null || perKm === null) return toast.error("Enter prices like 15.00");
        start(async () => {
          const res = await updateCourierRate({ baseFeeCents: base, perKmCents: perKm, maxKm });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Courier rate saved");
          router.refresh();
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="base">Base fee ($)</FieldLabel>
        <Input id="base" name="base" inputMode="decimal" defaultValue={courier ? (courier.baseFeeCents / 100).toFixed(2) : ""} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="perKm">Per km ($)</FieldLabel>
        <Input id="perKm" name="perKm" inputMode="decimal" defaultValue={courier ? (courier.perKmCents / 100).toFixed(2) : ""} required />
      </Field>
      <Field>
        <FieldLabel htmlFor="maxKm">Max distance (km)</FieldLabel>
        <Input id="maxKm" name="maxKm" type="number" min={1} step="any" defaultValue={courier?.maxKm ?? ""} required />
      </Field>
      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
