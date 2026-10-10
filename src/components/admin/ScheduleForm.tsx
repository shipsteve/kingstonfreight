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
}: {
  shipmentId: string;
  departureDate: string;
  estimatedArrival: string;
}) {
  const router = useRouter();
  const [dep, setDep] = useState(departureDate);
  const [arr, setArr] = useState(estimatedArrival);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateShipmentSchedule({
            shipmentId,
            departureDate: dep || null,
            estimatedArrival: arr || null,
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
      <Button type="submit" variant="outline" disabled={pending}>
        Save schedule
      </Button>
    </form>
  );
}
