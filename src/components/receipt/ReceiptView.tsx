import { Barcode128 } from "@/components/barcode/Barcode128";
import { formatShipDate } from "@/lib/dates";
import { countryName } from "@/lib/geo/countries";
import { plannedAirportStops } from "@/lib/geo/airports";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import { formatMoney } from "@/lib/money";
import type { Address } from "@/lib/pricing/types";
import { site } from "@/lib/site";
import type { ReceiptData } from "@/server/queries/receipt";

const SERVICE = { PARCEL: "Parcel", COURIER: "Local courier", FREIGHT: "Freight" } as const;
const MODE = { AIR: "Air", SEA: "Sea", ROAD: "Road" } as const;
const PAYMENT = { BALANCE: "Account balance", COUNTER: "Counter" } as const;
const BILL_TO = { SENDER: "Sender", RECIPIENT: "Recipient", THIRD_PARTY: "Third party" } as const;
const issuedFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function Party({ title, address }: { title: string; address: Address }) {
  return <section className="ticket-section">
    <h2 className="receipt-label">{title}</h2>
    <p className="font-bold">{address.name}</p>
    <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
    <p>{address.city}, {address.postcode} · {countryName(address.countryCode)}</p>
    {address.phone && <p>{address.phone}</p>}
    {address.email && <p>{address.email}</p>}
  </section>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="ticket-row"><span>{label}</span><span>{children}</span></div>;
}

/** An 80 mm shipping ticket; the preview uses the same narrow layout as the physical receipt. */
export function ReceiptView({ data, qrSvg, url }: { data: ReceiptData; qrSvg: string; url: string }) {
  const route = `${data.departurePort || `${data.sender.city}, ${data.sender.countryCode}`} → ${data.arrivalPort || `${data.recipient.city}, ${data.recipient.countryCode}`}`;
  return <article className="receipt" aria-label="Shipping ticket">
    <header className="ticket-heading">
      <h1>{site.name}</h1>
      <p className="receipt-label">Shipping receipt</p>
      <p>{issuedFmt.format(data.issuedAt)} UTC</p>
    </header>
    <section className="ticket-section ticket-tracking">
      <h2 className="receipt-label">Tracking number</h2>
      <p data-testid="receipt-tracking">{data.trackingNumber}</p>
      <Barcode128 value={data.trackingNumber} height={42} className="ticket-barcode" />
      <p>{SERVICE[data.serviceType]}{data.transportMode ? ` · ${MODE[data.transportMode]}` : ""}</p>
    </section>
    <Party title="From · sender" address={data.sender} />
    <Party title="To · recipient" address={data.recipient} />
    <section className="ticket-section">
      <h2 className="receipt-label">Route & delivery</h2>
      <Row label="Shipment status">{STATUS_LABELS[data.status]}</Row>
      <Row label="Route starts">Sender</Row>
      {plannedAirportStops(data).map((stop, index) => <Row key={stop.code} label={`Transit point ${index + 1}`}>{index === 0 && data.nextStop ? data.nextStop : "Upcoming transit point"}</Row>)}
      <Row label="Route ends">Delivery</Row>
      <p className="mb-1 font-bold">{route}</p>
      {data.nextStop && !data.deliveredAt && <Row label="Next transit point">{data.nextStop}</Row>}
      {data.departureDate && <Row label="Departure">{formatShipDate(data.departureDate)}</Row>}
      {data.estimatedArrival && <Row label="Hub arrival (est.)">{formatShipDate(data.estimatedArrival)}</Row>}
      <Row label={data.deliveredAt ? "Delivered" : "Delivery (est.)"}>
        <strong>{data.deliveredAt ? formatShipDate(data.deliveredAt) : data.estimatedDelivery ? formatShipDate(data.estimatedDelivery) : "To be confirmed"}</strong>
      </Row>
    </section>
    <section className="ticket-section">
      <h2 className="receipt-label">Package details</h2>
      {data.latestUpdate && <div className="ticket-piece">
        <h2 className="receipt-label">Latest tracking update</h2>
        <p>{data.latestUpdate.location}</p>
        {data.latestUpdate.note && <p>{data.latestUpdate.note}</p>}
        <p>{issuedFmt.format(data.latestUpdate.createdAt)} UTC</p>
        {data.latestUpdate.confirmedAt && <p>Location confirmed by admin</p>}
      </div>}
      {data.contents && <p className="mb-1">{data.contents}</p>}
      {data.pieces.map((piece, index) => <div className="ticket-piece" key={index}>
        <Row label={`#${index + 1} · ${piece.qty} pc(s)`}>{piece.weightKg} kg each</Row>
        <p>{piece.lengthCm} × {piece.widthCm} × {piece.heightCm} cm</p>
      </div>)}
      {data.actualWeightKg != null && <Row label="Actual weight">{data.actualWeightKg} kg</Row>}
      {data.chargeableWeightKg != null && <div data-testid="receipt-chargeable"><Row label="Chargeable weight">{data.chargeableWeightKg} kg</Row></div>}
      {data.declaredValueCents != null && <Row label="Declared value">{formatMoney(data.declaredValueCents)}</Row>}
      {data.goodsOriginCountry && <Row label="Goods origin">{countryName(data.goodsOriginCountry)}</Row>}
      {data.hsCode && <Row label="HS code">{data.hsCode}</Row>}
    </section>
    <section className="ticket-section">
      <Row label="Payment">{PAYMENT[data.paymentMethod]}</Row>
      {data.billTo && <Row label="Bill to">{BILL_TO[data.billTo]}</Row>}
      <Row label="Payment status"><strong>{data.paymentStatus}</strong></Row>
      <div className="ticket-total"><span>Total</span><strong>{formatMoney(data.priceCents)}</strong></div>
    </section>
    <footer className="ticket-section ticket-footer">
      <figure>
        <div className="ticket-qr" data-testid="receipt-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <figcaption>Scan to track your shipment</figcaption>
      </figure>
      <p className="ticket-url">Official Public Tracking Portal: <span>{url}</span></p>
      <p className="mt-2">Issued by: {data.issuedBy}</p>
      <p className="mt-1">Keep this ticket for your records.</p>
    </footer>
  </article>;
}
