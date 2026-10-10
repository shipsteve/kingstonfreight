import { formatShipDate } from "@/lib/dates";
import { countryName } from "@/lib/geo/countries";
import { formatMoney } from "@/lib/money";
import type { Address } from "@/lib/pricing/types";
import { site } from "@/lib/site";
import type { ReceiptData } from "@/server/queries/receipt";

const SERVICE = { PARCEL: "Parcel", COURIER: "Local courier", FREIGHT: "Freight" } as const;
const MODE = { AIR: "Air", SEA: "Sea", ROAD: "Road" } as const;
const BILL_TO = { SENDER: "Sender", RECIPIENT: "Recipient", THIRD_PARTY: "Third party" } as const;
const PAYMENT = { BALANCE: "Account balance", COUNTER: "Paid at counter" } as const;
const PAY_STATUS = { PAID: "Paid", UNPAID: "Unpaid", REFUNDED: "Refunded" } as const;
const issuedFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function Party({ title, a }: { title: string; a: Address }) {
  return (
    <div className="receipt-box">
      <p className="receipt-label">{title}</p>
      <p className="font-semibold">{a.name}</p>
      <p>{a.line1}</p>
      {a.line2 && <p>{a.line2}</p>}
      <p>
        {a.city}, {a.postcode}
      </p>
      <p>{countryName(a.countryCode)}</p>
      {a.phone && <p>Tel: {a.phone}</p>}
      {a.email && <p>{a.email}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** Printable shipping receipt. Light-on-white in every theme so it prints the same as it looks. */
export function ReceiptView({ data, qrSvg, url }: { data: ReceiptData; qrSvg: string; url: string }) {
  const route = [data.departurePort, data.arrivalPort].some(Boolean)
    ? `${data.departurePort ?? "—"} → ${data.arrivalPort ?? "—"}`
    : `${data.sender.city} → ${data.recipient.city}`;

  return (
    <article className="receipt mx-auto w-full max-w-[800px] rounded-lg border border-neutral-300 bg-white p-6 text-[13px] leading-snug text-neutral-900 sm:p-8">
      <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-4">
        <div>
          <p className="text-2xl font-bold tracking-tight">{site.name}</p>
          <p className="text-neutral-500">Shipping receipt</p>
          <p className="mt-3 text-xs text-neutral-500">Tracking number</p>
          <p className="font-mono text-2xl font-bold tracking-wider" data-testid="receipt-tracking">
            {data.trackingNumber}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Issued {issuedFmt.format(data.issuedAt)} · by {data.issuedBy}
          </p>
        </div>
        <figure className="shrink-0 text-center">
          <div
            className="size-32 [&_svg]:size-full"
            data-testid="receipt-qr"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <figcaption className="mt-1 text-[10px] text-neutral-500">Scan to track</figcaption>
        </figure>
      </header>

      <section className="grid gap-4 py-4 sm:grid-cols-2">
        <Party title="Sender (shipper)" a={data.sender} />
        <Party title="Recipient (consignee)" a={data.recipient} />
      </section>

      <section className="grid gap-4 border-t border-neutral-300 py-4 sm:grid-cols-2">
        <div>
          <p className="receipt-label">Service</p>
          <Row label="Service" value={SERVICE[data.serviceType]} />
          {data.transportMode && <Row label="Mode" value={MODE[data.transportMode]} />}
          <Row label="Route" value={route} />
          <Row label="Departure" value={data.departureDate ? formatShipDate(data.departureDate) : "To be scheduled"} />
          <Row
            label="Estimated arrival"
            value={data.estimatedArrival ? formatShipDate(data.estimatedArrival) : "To be scheduled"}
          />
        </div>
        <div>
          <p className="receipt-label">Contents</p>
          <Row label="Description" value={data.contents ?? "—"} />
          <Row
            label="Declared value"
            value={data.declaredValueCents != null ? formatMoney(data.declaredValueCents) : "—"}
          />
          {data.goodsOriginCountry && <Row label="Country of origin" value={countryName(data.goodsOriginCountry)} />}
          {data.hsCode && <Row label="HS code" value={data.hsCode} />}
        </div>
      </section>

      {data.pieces.length > 0 && (
        <section className="border-t border-neutral-300 py-4">
          <p className="receipt-label">Pieces</p>
          <table className="w-full text-left">
            <thead className="text-neutral-500">
              <tr>
                <th className="py-1 font-normal">#</th>
                <th className="py-1 font-normal">Qty</th>
                <th className="py-1 text-right font-normal">Weight</th>
                <th className="py-1 text-right font-normal">Dimensions (L×W×H)</th>
              </tr>
            </thead>
            <tbody>
              {data.pieces.map((p, i) => (
                <tr key={i} className="border-t border-neutral-200">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1">{p.qty}</td>
                  <td className="py-1 text-right tabular-nums">{p.weightKg} kg</td>
                  <td className="py-1 text-right tabular-nums">
                    {p.lengthCm} × {p.widthCm} × {p.heightCm} cm
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex justify-end gap-6 text-sm">
            <span>
              Actual weight <strong className="tabular-nums">{data.actualWeightKg ?? "—"} kg</strong>
            </span>
            <span data-testid="receipt-chargeable">
              Chargeable weight <strong className="tabular-nums">{data.chargeableWeightKg ?? "—"} kg</strong>
            </span>
          </div>
        </section>
      )}

      <section className="grid gap-4 border-t border-neutral-300 py-4 sm:grid-cols-2">
        <div>
          <p className="receipt-label">Charges</p>
          <Row label="Shipping charge" value={formatMoney(data.priceCents)} />
          {data.billTo && <Row label="Bill to" value={BILL_TO[data.billTo]} />}
          <Row label="Payment" value={PAYMENT[data.paymentMethod]} />
          <Row label="Status" value={PAY_STATUS[data.paymentStatus]} />
        </div>
        <div className="flex items-end justify-end">
          <p className="text-3xl font-bold tabular-nums">{formatMoney(data.priceCents)}</p>
        </div>
      </section>

      <footer className="border-t border-neutral-300 pt-3 text-[11px] text-neutral-500">
        <p>
          Liability is limited to the declared value. Carriage is subject to {site.name}&apos;s Terms of Service and
          Prohibited Items list.
        </p>
        <p className="mt-1 break-all">Track online: {url}</p>
      </footer>
    </article>
  );
}
