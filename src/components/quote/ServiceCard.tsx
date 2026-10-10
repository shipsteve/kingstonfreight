"use client";

import { TiltCard } from "@/components/cards/TiltCard";
import { cn } from "@/lib/utils";

export function ServiceCard({
  title,
  blurb,
  icon,
  selected,
  onSelect,
}: {
  title: string;
  blurb: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="rounded-2xl text-left" aria-pressed={selected}>
      <TiltCard
        maxTilt={8}
        className={cn(
          "h-full rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary",
          selected && "border-primary ring-2 ring-primary/20",
        )}
      >
        <span className="mb-4 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary [&_svg]:size-6">{icon}</span>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      </TiltCard>
    </button>
  );
}
