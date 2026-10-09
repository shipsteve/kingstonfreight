import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCustomers } from "@/server/queries/admin";

export const metadata = { title: "Customers" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Quotes</TableHead>
              <TableHead className="text-right">Shipments</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  <Link href={`/admin/shipments?q=${encodeURIComponent(c.email)}`} className="underline-offset-4 hover:underline">
                    {c.email}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c._count.quotes}</TableCell>
                <TableCell className="text-right tabular-nums">{c._count.shipments}</TableCell>
                <TableCell className="hidden md:table-cell">{dateFmt.format(c.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
