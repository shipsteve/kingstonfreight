"use client";

import { FileText, LayoutDashboard, Package, Tags, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/quotes", label: "Quotes to price", icon: FileText },
  { href: "/admin/shipments", label: "Shipments", icon: Package },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto border-b px-4 py-2 md:w-56 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:py-6"
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
              active && "bg-muted font-medium",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
