import { Reveal } from "./Reveal";

/** Reveals each direct <StaggerItem> in turn when the group scrolls into view. CSS-driven; see Reveal. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Reveal group className={className}>
      {children}
    </Reveal>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
