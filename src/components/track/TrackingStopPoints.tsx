import type { ShipmentStatus } from "@prisma/client";

export function TrackingStopPoints({ nextStop, status, stopCount = 1 }: { nextStop: string | null; status: ShipmentStatus; stopCount?: number }) {
  const complete = status === "DELIVERED";
  const cancelled = status === "CANCELLED";
  const isRerouting = status === "REROUTING";
  return <div className="rounded-xl border bg-muted/20 p-4" data-testid="tracking-stop-points">
    <p className="mb-4 text-sm font-semibold">Route transit points</p>
    <ol className="grid text-center text-xs" style={{ gridTemplateColumns: `repeat(${Math.max(1, stopCount) + 2}, minmax(0, 1fr))` }}>
      <li className="relative px-1">
        <span aria-hidden className="absolute top-2.5 left-1/2 h-px w-full bg-border" />
        <span aria-hidden className="relative mx-auto mb-2 block size-5 rounded-full border-2 border-primary bg-background" />
        <p className="font-medium">Sender</p>
      </li>
      <li className="relative px-1">
        <span aria-hidden className="absolute top-2.5 left-1/2 h-px w-full bg-border" />
        <span aria-hidden className="relative mx-auto mb-2 block size-5 rounded-full border-2 border-dashed border-primary bg-background" />
        <p className="font-medium">{complete || cancelled ? "Transit point" : "Next transit point"}</p>
        {!complete && !cancelled && <p className="mt-1 break-words text-primary">{nextStop ?? "Name to be confirmed"}</p>}
        {!complete && !cancelled && <p className="mt-1 text-muted-foreground">{isRerouting ? "Held for rerouting" : "Arrival not confirmed"}</p>}
      </li>
      {Array.from({ length: Math.max(0, stopCount - 1) }, (_, index) => <li className="relative px-1" key={index}>
        <span aria-hidden className="absolute top-2.5 left-1/2 h-px w-full bg-border" />
        <span aria-hidden className="relative mx-auto mb-2 block size-5 rounded-full border-2 border-dashed border-muted-foreground bg-background" />
        <p className="font-medium">Transit point {index + 2}</p>
        <p className="mt-1 text-muted-foreground">{complete ? "Transit point" : cancelled ? "Cancelled" : "Upcoming"}</p>
      </li>)}
      <li className="relative px-1">
        <span aria-hidden className={`relative mx-auto mb-2 block size-5 rounded-full border-2 ${complete ? "border-emerald-600 bg-emerald-600" : isRerouting ? "border-amber-500 bg-amber-500/20" : "border-muted-foreground bg-background"}`} />
        <p className="font-medium">Delivery</p>
        <p className="mt-1 text-muted-foreground">{complete ? "Confirmed" : cancelled ? "Cancelled" : isRerouting ? "Paused for Reroute" : "Pending"}</p>
      </li>
    </ol>
  </div>;
}
