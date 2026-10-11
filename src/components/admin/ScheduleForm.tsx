"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateShipmentSchedule } from "@/server/actions/admin-orders";

export function ScheduleForm({
  shipmentId,
  departureDate,
  estimatedArrival,
  estimatedDelivery,
  nextStop,
}: {
  shipmentId: string;
  departureDate: string;
  estimatedArrival: string;
  estimatedDelivery: string;
  nextStop: string | null;
}) {
  const router = useRouter();
  const [dep, setDep] = useState(departureDate);
  const [arr, setArr] = useState(estimatedArrival);
  const [delivery, setDelivery] = useState(estimatedDelivery);
  const [stop, setStop] = useState(nextStop ?? "");
  const [pending, start] = useTransition();

  return (
    <form
      className="grid items-end gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateShipmentSchedule({
            shipmentId,
            departureDate: dep || null,
            estimatedArrival: arr || null,
            estimatedDelivery: delivery || null,
            nextStop: stop || null,
          });
          if (!res.ok) return void toast.error(res.error);
          toast.success("Schedule saved");
          router.refresh();
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="sched-dep">Departure date</FieldLabel>
        <Input id="sched-dep" type="date" value={dep} onChange={(e) => setDep(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="sched-arr">Estimated arrival</FieldLabel>
        <Input id="sched-arr" type="date" min={dep || undefined} value={arr} onChange={(e) => setArr(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="sched-delivery">Estimated delivery date</FieldLabel>
        <Input id="sched-delivery" type="date" min={arr || dep || undefined} value={delivery} onChange={(e) => setDelivery(e.target.value)} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        Save schedule
      </Button>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="sched-next-stop">Next transit point name</FieldLabel>
        <Input id="sched-next-stop" value={stop} maxLength={200} placeholder="Enter the next transit point" onChange={(e) => setStop(e.target.value)} />
        <p className="text-xs text-muted-foreground">Shown as a transit point. Confirm arrival separately with a tracking update.</p>
      </Field>
    </form>
  );
}
