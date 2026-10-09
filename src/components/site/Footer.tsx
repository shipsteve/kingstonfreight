import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
          <Link href="/quote" className="hover:underline">
            Get a quote
          </Link>
          <Link href="/track" className="hover:underline">
            Track a shipment
          </Link>
          <Link href="/dashboard" className="hover:underline">
            Your shipments
          </Link>
          <Link href="/register" className="hover:underline">
            Create account
          </Link>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {site.name}
      </p>
    </footer>
  );
}
