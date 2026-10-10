import { site } from "@/lib/site";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path d="M8 12.5 16 8l8 4.5v9L16 26l-8-4.5z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="m8 12.5 8 4.5 8-4.5M16 17v9" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {site.name}
    </span>
  );
}
