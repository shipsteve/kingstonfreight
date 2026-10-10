import Link from "next/link";
import { CustomerControls } from "@/components/admin/CustomerControls";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { listCustomers } from "@/server/queries/admin";

export const metadata = { title: "Customers" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const STATUS = {
  PENDING: { label: "Pending", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  APPROVED: { label: "Approved", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  SUSPENDED: { label: "Suspended", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
} as const;

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="hidden text-right md:table-cell">Shipments</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.name}</p>
                  <Link
                    href={`/admin/shipments?q=${encodeURIComponent(c.email)}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {c.email}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={`border-transparent ${STATUS[c.accountStatus].className}`}>
                    {STATUS[c.accountStatus].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(c.balanceCents)}</TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">{c._count.shipments}</TableCell>
                <TableCell className="hidden lg:table-cell">{dateFmt.format(c.createdAt)}</TableCell>
                <TableCell>
                  <CustomerControls userId={c.id} status={c.accountStatus} name={c.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
