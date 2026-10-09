"use client";

import type { ShipmentStatus } from "@prisma/client";
import { CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { STATUS_LABELS } from "@/lib/tracking/labels";

export type TimelineEvent = {
  status: ShipmentStatus;
  location: string;
  note?: string | null;
  createdAt: Date | string;
};

const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

/** Events oldest → newest in, rendered newest first. */
export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No tracking updates yet.</p>;
  const ordered = [...events].reverse();

  return (
    <MotionConfig reducedMotion="user">
      <ol className="relative space-y-6">
        {ordered.map((e, i) => {
          const latest = i === 0;
          const Icon = e.status === "EXCEPTION" ? TriangleAlert : latest ? CheckCircle2 : Circle;
          return (
            <motion.li
              key={`${e.status}-${String(e.createdAt)}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="relative flex gap-4"
            >
              {i < ordered.length - 1 && (
                <span className="absolute top-6 left-[11px] h-[calc(100%+0.5rem)] w-px bg-border" />
              )}
              <Icon
                className={`relative mt-0.5 size-6 shrink-0 ${
                  e.status === "EXCEPTION" ? "text-destructive" : latest ? "text-primary" : "text-muted-foreground"
                }`}
                aria-hidden
              />
              <div>
                <p className={latest ? "font-medium" : ""}>{STATUS_LABELS[e.status]}</p>
                <p className="text-sm text-muted-foreground">
                  {e.location} ·{" "}
                  <time dateTime={new Date(e.createdAt).toISOString()}>{fmt.format(new Date(e.createdAt))}</time>
                </p>
                {e.note && <p className="mt-1 text-sm">{e.note}</p>}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </MotionConfig>
  );
}
