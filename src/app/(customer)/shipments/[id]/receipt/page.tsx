import { ReceiptPage } from "@/components/receipt/ReceiptPage";
import { getReceiptForOwner } from "@/server/queries/receipt";

export const metadata = { title: "Receipt" };

export default async function CustomerReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptPage data={await getReceiptForOwner(id)} backHref={`/shipments/${id}`} />;
}
