import type { QuoteStatus, ShipmentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import { cn } from "@/lib/utils";

const TONE: Record<ShipmentStatus, string> = {
  BOOKED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  PICKED_UP: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  IN_TRANSIT: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  CUSTOMS: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  OUT_FOR_DELIVERY: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  EXCEPTION: "bg-red-500/15 text-red-700 dark:text-red-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  return <Badge className={cn("border-transparent", TONE[status], className)}>{STATUS_LABELS[status]}</Badge>;
}

const QUOTE_LABELS: Record<QuoteStatus, string> = {
  PENDING_REVIEW: "Awaiting price",
  PRICED: "Ready to book",
  ACCEPTED: "Booked",
  EXPIRED: "Expired",
  DECLINED: "Declined",
};

const QUOTE_TONE: Record<QuoteStatus, string> = {
  PENDING_REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  PRICED: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ACCEPTED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  EXPIRED: "bg-muted text-muted-foreground",
  DECLINED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge className={cn("border-transparent", QUOTE_TONE[status])}>{QUOTE_LABELS[status]}</Badge>;
}
