import { AdminOrderForm } from "@/components/admin/AdminOrderForm";
import { config } from "@/lib/config";

export const metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
        <p className="text-muted-foreground">For counter, phone or account customers. You can print the receipt next.</p>
      </div>
      <AdminOrderForm homeCountry={config.homeCountry} />
    </div>
  );
}
