import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCounts } from "@/server/queries/admin";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const counts = await getAdminCounts();
  const tiles = [
    { label: "Freight quotes to price", value: counts.pendingQuotes, href: "/admin/quotes" },
    { label: "Moving now", value: counts.inTransit, href: "/admin/shipments?status=IN_TRANSIT" },
    { label: "Exceptions", value: counts.exceptions, href: "/admin/shipments?status=EXCEPTION" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="transition-colors hover:border-primary">
              <CardHeader>
                <CardDescription>{t.label}</CardDescription>
                <CardTitle className="text-4xl tabular-nums">{t.value}</CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
