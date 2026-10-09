import { Reveal } from "./Reveal";

/** Fades and lifts content in when it scrolls into view (once). CSS-driven; see Reveal. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <Reveal className={className} delay={delay}>
      {children}
    </Reveal>
  );
}
