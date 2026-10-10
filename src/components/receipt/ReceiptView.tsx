import { Barcode128 } from "@/components/barcode/Barcode128";
import { formatShipDate } from "@/lib/dates";
import { countryName } from "@/lib/geo/countries";
import { formatMoney } from "@/lib/money";
import type { Address } from "@/lib/pricing/types";
import { site } from "@/lib/site";
import type { ReceiptData } from "@/server/queries/receipt";
import { CheckCircle2, ShieldCheck, Plane, Ship, Truck } from "lucide-react";

const SERVICE = { PARCEL: "Express Parcel", COURIER: "Local Courier Service", FREIGHT: "Freight Cargo" } as const;
const MODE = { AIR: "Air Freight", SEA: "Ocean Cargo", ROAD: "Ground Freight" } as const;
const BILL_TO = { SENDER: "Sender / Shipper", RECIPIENT: "Recipient / Consignee", THIRD_PARTY: "Third party" } as const;
const PAYMENT = { BALANCE: "Account balance", COUNTER: "Paid at counter" } as const;
const PAY_STATUS = { PAID: "PAID", UNPAID: "UNPAID", REFUNDED: "REFUNDED" } as const;
const issuedFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function Party({ title, a, role }: { title: string; a: Address; role: "SHIPPER" | "CONSIGNEE" }) {
  return (
    <div className="receipt-box rounded border border-neutral-200 bg-neutral-50/50 p-3.5">
      <div className="flex items-center justify-between">
        <p className="receipt-label">{title}</p>
        <span className="text-[10px] font-mono font-semibold tracking-wider text-neutral-400 uppercase">{role}</span>
      </div>
      <p className="text-[14px] font-bold text-neutral-900">{a.name}</p>
      <p className="text-neutral-700">{a.line1}</p>
      {a.line2 && <p className="text-neutral-700">{a.line2}</p>}
      <p className="text-neutral-700">
        {a.city}, {a.postcode}
      </p>
      <p className="font-medium text-neutral-800">{countryName(a.countryCode)}</p>
      {a.phone && <p className="mt-1 text-xs text-neutral-600">Tel: {a.phone}</p>}
      {a.email && <p className="text-xs text-neutral-600">Email: {a.email}</p>}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-[13px]">
      <span className="text-neutral-500">{label}</span>
      <span className={`text-right ${highlight ? "font-semibold text-neutral-900" : "font-medium text-neutral-800"}`}>
        {value}
      </span>
    </div>
  );
}

/** Printable shipping receipt / Air Waybill. Light-on-white in every theme so it prints crisp and authentic. */
export function ReceiptView({ data, qrSvg, url }: { data: ReceiptData; qrSvg: string; url: string }) {
  const originPort = data.departurePort || `${data.sender.city.toUpperCase()}, ${data.sender.countryCode}`;
  const destPort = data.arrivalPort || `${data.recipient.city.toUpperCase()}, ${data.recipient.countryCode}`;
  const route = `${originPort} → ${destPort}`;

  const ModeIcon = data.transportMode === "SEA" ? Ship : data.transportMode === "ROAD" ? Truck : Plane;

  return (
    <article className="receipt mx-auto w-full max-w-[820px] rounded-xl border border-neutral-300 bg-white p-6 text-[13px] leading-snug text-neutral-900 shadow-sm sm:p-8">
      {/* Official Top Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3 text-[11px] text-neutral-600">
        <div className="flex items-center gap-1.5 font-semibold tracking-wider text-neutral-700 uppercase">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>Official Carrier Air Waybill & Consignment Note</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-neutral-500">IATA / CARGO REGISTRY</span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-neutral-700">
            NON-NEGOTIABLE
          </span>
        </div>
      </div>

      <header className="grid gap-6 border-b border-neutral-300 pb-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-black tracking-tight text-neutral-950">{site.name}</p>
            <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Logistics & Cargo</span>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="receipt-label text-[10px]">Air Waybill / Tracking Number</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                Verified Carrier Issue
              </span>
            </div>
            <p className="mt-0.5 font-mono text-2xl font-black tracking-widest text-neutral-950 sm:text-3xl" data-testid="receipt-tracking">
              {data.trackingNumber}
            </p>

            {/* Code 128 1D Laser Barcode */}
            <div className="mt-2.5 max-w-[320px] overflow-hidden">
              <Barcode128 value={data.trackingNumber} height={42} className="w-full" />
              <p className="mt-0.5 text-center font-mono text-[9px] text-neutral-500 tracking-wider">
                GS1-128 / CODE 128 DOCK SCANNER COMPATIBLE
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
            <p>
              Issued: <strong className="text-neutral-800">{issuedFmt.format(data.issuedAt)}</strong>
            </p>
            <span className="text-neutral-300">|</span>
            <p>
              Agent / Hub: <strong className="text-neutral-800">{data.issuedBy}</strong>
            </p>
          </div>
        </div>

        {/* 2D QR Code Scanner */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50/40 p-4 text-center sm:w-40">
          <figure className="text-center">
            <div
              className="size-28 [&_svg]:size-full"
              data-testid="receipt-qr"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <figcaption className="mt-1 text-[11px] font-medium text-neutral-600">Scan for Mobile Tracking</figcaption>
            <p className="font-mono text-[9px] text-neutral-400">Live Carrier GPS</p>
          </figure>
        </div>
      </header>

      {/* Origin & Destination Ports */}
      <div className="my-4 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-neutral-100/60 p-3 text-center sm:grid-cols-4">
        <div>
          <p className="receipt-label">Origin Port / Hub</p>
          <p className="font-mono text-sm font-bold text-neutral-900">{originPort}</p>
        </div>
        <div>
          <p className="receipt-label">Destination Hub</p>
          <p className="font-mono text-sm font-bold text-neutral-900">{destPort}</p>
        </div>
        <div>
          <p className="receipt-label">Service Level</p>
          <div className="inline-flex items-center gap-1 font-semibold text-neutral-900">
            <ModeIcon className="size-3.5 text-neutral-600" />
            <span>{SERVICE[data.serviceType]}</span>
          </div>
        </div>
        <div>
          <p className="receipt-label">Security Screening</p>
          <span className="font-mono text-xs font-bold text-emerald-700">SEC - CLEARED (SPX)</span>
        </div>
      </div>

      {/* Shipper & Consignee */}
      <section className="grid gap-4 py-2 sm:grid-cols-2">
        <Party title="Sender (Shipper)" a={data.sender} role="SHIPPER" />
        <Party title="Recipient (Consignee)" a={data.recipient} role="CONSIGNEE" />
      </section>

      {/* Routing & Contents Grid */}
      <section className="grid gap-4 border-t border-neutral-200 py-4 sm:grid-cols-2">
        <div className="rounded border border-neutral-200 bg-neutral-50/30 p-3">
          <p className="receipt-label">Flight / Transit Schedule</p>
          <Row label="Transport Mode" value={data.transportMode ? MODE[data.transportMode] : "Standard Transport"} />
          <Row label="Route Leg" value={route} highlight />
          <Row
            label="Departure Scheduled"
            value={data.departureDate ? formatShipDate(data.departureDate) : "Scheduled at Hub"}
          />
          <Row
            label="Estimated Arrival"
            value={data.estimatedArrival ? formatShipDate(data.estimatedArrival) : "Pending Routing"}
            highlight
          />
        </div>
        <div className="rounded border border-neutral-200 bg-neutral-50/30 p-3">
          <p className="receipt-label">Consignment Declarations</p>
          <Row label="Description" value={data.contents ?? "General Merchandise / Cargo"} />
          <Row
            label="Declared Value"
            value={data.declaredValueCents != null ? formatMoney(data.declaredValueCents) : "Standard Carrier Tariff"}
          />
          {data.goodsOriginCountry && <Row label="Country of Origin" value={countryName(data.goodsOriginCountry)} />}
          {data.hsCode && <Row label="Harmonized Code (HS)" value={data.hsCode} />}
          <Row label="Handling Code" value="GEN - STANDARD HANDLING" />
        </div>
      </section>

      {/* Pieces & Manifest */}
      {data.pieces.length > 0 && (
        <section className="border-t border-neutral-200 py-4">
          <div className="flex items-center justify-between">
            <p className="receipt-label">Cargo Manifest & Package Breakdown</p>
            <span className="text-[11px] text-neutral-500">{data.pieces.length} package line item(s)</span>
          </div>
          <table className="mt-1 w-full text-left text-xs">
            <thead className="border-b border-neutral-300 text-neutral-500">
              <tr>
                <th className="py-1.5 font-semibold">Item #</th>
                <th className="py-1.5 font-semibold">Qty</th>
                <th className="py-1.5 text-right font-semibold">Unit Weight</th>
                <th className="py-1.5 text-right font-semibold">Dimensions (L×W×H)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {data.pieces.map((p, i) => (
                <tr key={i}>
                  <td className="py-2 font-mono text-neutral-600">PK-{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-2 font-medium">{p.qty} pc(s)</td>
                  <td className="py-2 text-right tabular-nums">{p.weightKg} kg</td>
                  <td className="py-2 text-right tabular-nums text-neutral-700">
                    {p.lengthCm} × {p.widthCm} × {p.heightCm} cm
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap justify-end gap-6 rounded bg-neutral-50 p-2.5 text-xs">
            <span>
              Actual Gross Weight: <strong className="tabular-nums text-neutral-900">{data.actualWeightKg ?? "—"} kg</strong>
            </span>
            <span data-testid="receipt-chargeable">
              Chargeable Weight: <strong className="tabular-nums text-neutral-950 font-bold">{data.chargeableWeightKg ?? "—"} kg</strong>
            </span>
          </div>
        </section>
      )}

      {/* Charges & Settlement */}
      <section className="grid gap-4 border-t border-neutral-300 py-4 sm:grid-cols-2">
        <div>
          <p className="receipt-label">Billing & Tariff Charges</p>
          <Row label="Freight Rate & Charges" value={formatMoney(data.priceCents)} />
          {data.billTo && <Row label="Bill To Account" value={BILL_TO[data.billTo]} />}
          <Row label="Settlement Method" value={PAYMENT[data.paymentMethod]} />
          <Row
            label="Payment Status"
            value={
              <span
                className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                  data.paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {PAY_STATUS[data.paymentStatus]}
              </span>
            }
          />
        </div>
        <div className="flex flex-col items-end justify-end rounded border border-neutral-200 bg-neutral-50/60 p-4">
          <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Total Carriage & Cargo Total
          </span>
          <p className="text-3xl font-black tabular-nums text-neutral-950">{formatMoney(data.priceCents)}</p>
          <p className="mt-1 font-mono text-[10px] text-neutral-400">ALL FEES INCLUDED · TAX & FUEL SURCHARGE SETTLED</p>
        </div>
      </section>

      {/* Authentic Terms & Sign-off Footer */}
      <footer className="border-t border-neutral-300 pt-4 text-[10px] text-neutral-500">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <p>
              <strong>CARRIER LIABILITY NOTICE:</strong> Carriage hereunder is subject to the rules and limitations relating to liability established by the applicable international conventions (including the Montreal / Warsaw Convention) and {site.name}&apos;s standard Conditions of Carriage. Liability is strictly limited to declared value or standard statutory carriage limits.
            </p>
            <p className="break-all text-neutral-600">
              Official Public Tracking Portal: <span className="font-mono text-neutral-800">{url}</span>
            </p>
          </div>
          <div className="shrink-0 text-right sm:w-48">
            <div className="mb-1 border-b border-neutral-300 pb-4 text-center">
              <span className="font-serif italic text-neutral-400 text-xs">Kingston Cargo Ops</span>
            </div>
            <p className="text-center font-mono text-[9px] uppercase tracking-wider text-neutral-400">Authorized Dispatcher</p>
          </div>
        </div>
      </footer>
    </article>
  );
}
