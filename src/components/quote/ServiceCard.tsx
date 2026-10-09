"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <button type="button" onClick={onSelect} className="text-left" aria-pressed={selected}>
      <Card className={`h-full transition-colors hover:border-primary ${selected ? "border-primary" : ""}`}>
        <CardHeader>
          <span className="mb-2 text-primary [&_svg]:size-7">{icon}</span>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{blurb}</CardDescription>
        </CardHeader>
      </Card>
    </button>
  );
}
