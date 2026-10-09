"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { detectEnv, shouldUse3D } from "./capability";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

/**
 * Shows `fallback` (static image) during SSR, on low-end/small/reduced-motion devices, and if the scene crashes.
 * Otherwise renders the lazily-loaded scene, telling it whether it's on screen so it can stop rendering.
 */
export function SceneSlot({
  fallback,
  className,
  render,
}: {
  fallback: ReactNode;
  className?: string;
  render: (active: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [use3D, setUse3D] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capability check needs the browser
    setUse3D(shouldUse3D(detectEnv()));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {use3D ? <SceneErrorBoundary fallback={fallback}>{render(visible)}</SceneErrorBoundary> : fallback}
    </div>
  );
}
