import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { trackingUrl } from "@/lib/receipt";
import { qrSvg } from "@/server/qr";
import type { ReceiptData } from "@/server/queries/receipt";
import { PrintButton } from "./PrintButton";
import { ReceiptView } from "./ReceiptView";

/** Shared page shell for the admin and customer receipt routes. */
export async function ReceiptPage({ data, backHref }: { data: ReceiptData | null; backHref: string }) {
  if (!data) notFound();
  const url = trackingUrl(data.trackingNumber);
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-8 print:p-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className={buttonVariants({ variant: "ghost" })}>
          ← Back
        </Link>
        <PrintButton />
      </div>
      <ReceiptView data={data} qrSvg={await qrSvg(url)} url={url} />
    </main>
  );
}
