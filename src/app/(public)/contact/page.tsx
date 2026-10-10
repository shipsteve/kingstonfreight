import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  const l = legal();
  return (
    <LegalPage title={`Contact ${site.name}`} intro={site.tagline}>
      <h2>About us</h2>
      <p>
        {site.name} moves parcels, same-day local courier deliveries and freight by air, sea and road, at home and
        abroad. Every shipment is priced by our team, paid from your prepaid balance and tracked to the door.
      </p>

      <h2>Get in touch</h2>
      <ul className="!ml-0 space-y-3 [&_li]:!ml-0 [&_li]:list-none">
        {l.supportEmail && (
          <li className="flex items-center gap-3">
            <Mail className="size-5 text-primary" />
            <a href={`mailto:${l.supportEmail}`} className="underline underline-offset-4">
              {l.supportEmail}
            </a>
          </li>
        )}
        {l.supportPhone && (
          <li className="flex items-center gap-3">
            <Phone className="size-5 text-primary" />
            <a href={`tel:${l.supportPhone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
              {l.supportPhone}
            </a>
          </li>
        )}
        {l.address && (
          <li className="flex items-center gap-3">
            <MapPin className="size-5 text-primary" />
            <span>
              {l.legalName}, {l.address}
            </span>
          </li>
        )}
      </ul>
      {!l.supportEmail && !l.supportPhone && !l.address && (
        <p>
          Signed-in customers can reply to any email we send about their shipment, or{" "}
          <Link href="/track">track a shipment</Link> any time.
        </p>
      )}

      <h2>Policies</h2>
      <ul>
        <li>
          <Link href="/terms">Terms of Service</Link>
        </li>
        <li>
          <Link href="/privacy">Privacy Policy</Link>
        </li>
        <li>
          <Link href="/refunds">Refunds &amp; Cancellations</Link>
        </li>
        <li>
          <Link href="/prohibited-items">Prohibited Items</Link>
        </li>
      </ul>
    </LegalPage>
  );
}
