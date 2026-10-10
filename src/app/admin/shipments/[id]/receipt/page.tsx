import { ReceiptPage } from "@/components/receipt/ReceiptPage";
import { getReceiptForAdmin } from "@/server/queries/receipt";

export const metadata = { title: "Receipt" };

export default async function AdminReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptPage data={await getReceiptForAdmin(id)} backHref={`/admin/shipments/${id}`} />;
}
