import type { ShipmentStatus } from "@prisma/client";
import Link from "next/link";
import { StatusBadge } from "@/components/shipment/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { asAddress, shortPlace } from "@/lib/address";
import { formatMoney } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import { listShipments } from "@/server/queries/admin";

export const metadata = { title: "Shipments" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUS_LABELS ? (sp.status as ShipmentStatus) : undefined;
  const shipments = await listShipments({ status, q: sp.q });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Shipments</h1>
      <form className="flex flex-wrap gap-2" action="/admin/shipments">
        <Input name="q" placeholder="Tracking number or email" defaultValue={sp.q} className="max-w-xs" />
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Status"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No shipments match.
                </TableCell>
              </TableRow>
            )}
            {shipments.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/admin/shipments/${s.id}`} className="font-mono font-medium underline-offset-4 hover:underline">
                    {s.trackingNumber}
                  </Link>
                </TableCell>
                <TableCell>{s.user?.email ?? s.customerEmail ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {shortPlace(asAddress(s.origin))} → {shortPlace(asAddress(s.destination))}
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(s.priceCents)}
                  <span className="ml-1 text-xs text-muted-foreground">{s.paymentStatus === "PAID" ? "paid" : "unpaid"}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{dateFmt.format(s.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
