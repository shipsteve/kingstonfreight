"use client";

import type { PaymentStatus, ShipmentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_OPTIONS } from "@/lib/geo/countries";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import { setPaymentStatus, updateShipmentStatus } from "@/server/actions/admin-shipments";

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30";

export function StatusUpdateForm({ shipmentId, options }: { shipmentId: string; options: ShipmentStatus[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        start(async () => {
          setError(null);
          const res = await updateShipmentStatus({
            shipmentId,
            status: f.get("status") as ShipmentStatus,
            location: String(f.get("location") ?? ""),
            countryCode: String(f.get("countryCode") ?? ""),
            note: String(f.get("note") ?? ""),
            lat: f.get("lat") ? Number(f.get("lat")) : undefined,
            lng: f.get("lng") ? Number(f.get("lng")) : undefined,
          });
          if (!res.ok) return setError(res.error);
          toast.success("Update posted and customer emailed");
          form.reset();
          router.refresh();
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="status">Shipment status</FieldLabel>
        <select id="status" name="status" className={selectClass} defaultValue={options[0]}>
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="location">Location</FieldLabel>
        <Input id="location" name="location" placeholder="e.g. JFK hub, New York" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="countryCode">Country (approximate location)</FieldLabel>
        <select id="countryCode" name="countryCode" className={selectClass} defaultValue="">
          <option value="">—</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="note">Status message (shown publicly)</FieldLabel>
        <Textarea id="note" name="note" rows={1} />
      </Field>
      <Field>
        <FieldLabel htmlFor="lat">Confirmed latitude (optional)</FieldLabel>
        <Input id="lat" name="lat" type="number" step="any" min={-90} max={90} placeholder="e.g. 40.6413" />
      </Field>
      <Field>
        <FieldLabel htmlFor="lng">Confirmed longitude (optional)</FieldLabel>
        <Input id="lng" name="lng" type="number" step="any" min={-180} max={180} placeholder="e.g. -73.7781" />
      </Field>
      <p className="text-xs text-muted-foreground sm:col-span-2">Enter both coordinates to place the confirmed map marker. Posting confirms this update and publishes the location and message on tracking. Keep the same status to add another transit checkpoint.</p>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          Confirm & publish update
        </Button>
      </div>
    </form>
  );
}

export function PaymentToggle({ shipmentId, paymentStatus }: { shipmentId: string; paymentStatus: PaymentStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: PaymentStatus = paymentStatus === "PAID" ? "UNPAID" : "PAID";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{paymentStatus === "PAID" ? "Paid" : "Unpaid"}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setPaymentStatus({ shipmentId, paymentStatus: next });
            if (!res.ok) toast.error(res.error);
            else router.refresh();
          })
        }
      >
        Mark {next === "PAID" ? "paid" : "unpaid"}
      </Button>
    </div>
  );
}
