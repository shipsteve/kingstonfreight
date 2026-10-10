"use client";

import { cn } from "@/lib/utils";

/** Card whose border glows where the cursor is (styles in globals.css .glow-card). */
export function GlowCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("glow-card rounded-2xl", className)}
      onPointerMove={(e) => {
        props.onPointerMove?.(e);
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
      }}
    >
      <div className="h-full rounded-[inherit] border bg-card">{children}</div>
    </div>
  );
}
