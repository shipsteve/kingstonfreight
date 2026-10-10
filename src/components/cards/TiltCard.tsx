"use client";

import { cn } from "@/lib/utils";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Pointer-driven 3D tilt with a glare highlight. Writes CSS variables directly (no re-render per move);
 * the transform itself lives in the .tilt-card class in globals.css.
 */
export function TiltCard({
  maxTilt = 10,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { maxTilt?: number }) {
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    props.onPointerMove?.(e);
    if (prefersReducedMotion()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tilt-x", `${((0.5 - py) * 2 * maxTilt).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${((px - 0.5) * 2 * maxTilt).toFixed(2)}deg`);
    el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
    el.dataset.tilting = "true";
  }

  function onPointerLeave(e: React.PointerEvent<HTMLDivElement>) {
    props.onPointerLeave?.(e);
    const el = e.currentTarget;
    el.style.removeProperty("--tilt-x");
    el.style.removeProperty("--tilt-y");
    delete el.dataset.tilting;
  }

  return (
    <div {...props} className={cn("tilt-card", className)} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      {children}
      <span aria-hidden className="tilt-card-glare" />
    </div>
  );
}
