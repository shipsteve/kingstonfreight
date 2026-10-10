"use client";

import { useEffect, useRef } from "react";

/**
 * Marks its element data-revealed once it scrolls into view. The animation itself is CSS ([data-reveal] in
 * globals.css), so the landing page doesn't ship an animation library. Content is visible without JS.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  group = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  group?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.revealed = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      {...(group ? { "data-reveal-group": "" } : { "data-reveal": "" })}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
