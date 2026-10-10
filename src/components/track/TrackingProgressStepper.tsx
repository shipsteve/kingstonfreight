"use client";

import type { ShipmentStatus } from "@prisma/client";
import { Check, Clock, PackageCheck, Plane, ShieldCheck, Home, AlertTriangle, XCircle, FileText } from "lucide-react";
import { STATUS_LABELS } from "@/lib/tracking/labels";

export type StepperEvent = {
  status: ShipmentStatus;
  createdAt: Date | string;
};

type StepDef = {
  id: string;
  name: string;
  icon: typeof FileText;
  statuses: ShipmentStatus[];
  description: string;
};

const STEPS: StepDef[] = [
  {
    id: "booked",
    name: "Order Booked",
    icon: FileText,
    statuses: ["BOOKED"],
    description: "Consignment created & manifested",
  },
  {
    id: "pickup",
    name: "Depot Received",
    icon: PackageCheck,
    statuses: ["PICKED_UP"],
    description: "Cargo screened at origin facility",
  },
  {
    id: "transit",
    name: "In Transit",
    icon: Plane,
    statuses: ["IN_TRANSIT"],
    description: "Linehaul flight / ocean dispatch",
  },
  {
    id: "customs",
    name: "Customs & Clearance",
    icon: ShieldCheck,
    statuses: ["CUSTOMS"],
    description: "Regulatory inspection & duty release",
  },
  {
    id: "delivered",
    name: "Delivered",
    icon: Home,
    statuses: ["OUT_FOR_DELIVERY", "DELIVERED"],
    description: "Final consignee receipt confirmed",
  },
];

const fmtShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function getActiveStepIndex(status: ShipmentStatus): number {
  switch (status) {
    case "BOOKED":
      return 0;
    case "PICKED_UP":
      return 1;
    case "IN_TRANSIT":
      return 2;
    case "CUSTOMS":
      return 3;
    case "OUT_FOR_DELIVERY":
    case "DELIVERED":
      return 4;
    case "EXCEPTION":
      return 2; // Flagged in transit
    case "CANCELLED":
      return -1;
  }
}

export function TrackingProgressStepper({
  currentStatus,
  events = [],
}: {
  currentStatus: ShipmentStatus;
  events?: StepperEvent[];
}) {
  const isCancelled = currentStatus === "CANCELLED";
  const isException = currentStatus === "EXCEPTION";
  const activeIdx = getActiveStepIndex(currentStatus);
  const isAllComplete = currentStatus === "DELIVERED";

  // Find latest timestamp for each step
  const timestampByStatus = new Map<ShipmentStatus, Date>();
  for (const e of events) {
    timestampByStatus.set(e.status, new Date(e.createdAt));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6" data-testid="tracking-progress-stepper">
      {/* Alerts for Exception or Cancelled */}
      {isException && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Shipment Exception Encountered</p>
            <p className="text-xs opacity-90">Our logistics operations team is actively addressing an inspection or carrier delay.</p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
          <XCircle className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">Shipment Cancelled</p>
            <p className="text-xs opacity-90">This consignment has been stopped or refunded by carrier dispatch.</p>
          </div>
        </div>
      )}

      {/* Progress Stepper Pipeline */}
      <div className="relative">
        {/* Background track line */}
        <div className="absolute top-5 left-4 right-4 hidden h-1 -translate-y-1/2 rounded bg-muted md:block" aria-hidden="true">
          <div
            className="h-full rounded bg-primary transition-all duration-500"
            style={{
              width: isCancelled
                ? "0%"
                : isAllComplete
                ? "100%"
                : `${Math.max(0, (activeIdx / (STEPS.length - 1)) * 100)}%`,
            }}
          />
        </div>

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = !isCancelled && (isAllComplete || idx < activeIdx);
            const isCurrent = !isCancelled && idx === activeIdx && !isAllComplete;
            const isUpcoming = isCancelled || (!isCompleted && !isCurrent);

            // Find timestamp
            let stepDate: Date | undefined;
            for (const s of step.statuses) {
              if (timestampByStatus.has(s)) {
                stepDate = timestampByStatus.get(s);
                break;
              }
            }

            return (
              <li key={step.id} className="relative flex items-start gap-4 md:flex-col md:items-center md:text-center">
                {/* Step Node Icon */}
                <div className="relative flex shrink-0 items-center justify-center">
                  {isCurrent && (
                    <span className="absolute -inset-1.5 animate-ping rounded-full bg-primary/30 opacity-75" />
                  )}
                  <div
                    className={`relative flex size-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : isCurrent
                        ? "border-primary bg-background text-primary ring-4 ring-primary/20 shadow-sm"
                        : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="size-5 stroke-[2.5]" />
                    ) : (
                      <Icon className="size-4.5" />
                    )}
                  </div>
                </div>

                {/* Step Description */}
                <div className="min-w-0 flex-1 md:w-full md:pt-2">
                  <div className="flex items-center gap-2 md:justify-center">
                    <p
                      className={`text-sm font-semibold tracking-tight ${
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.name}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider md:hidden">
                        In Progress
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {step.description}
                  </p>

                  {stepDate && (
                    <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground md:justify-center">
                      <Clock className="size-3" />
                      <span>{fmtShort.format(stepDate)}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
