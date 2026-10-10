import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const l = legal();
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These terms govern your use of ${site.name}'s website and shipping services. By creating an account or booking a shipment you agree to them.`}
    >
      <h2>1. Who we are</h2>
      <p>
        {site.name} is operated by {l.legalName}
        {l.address ? `, ${l.address}` : ""}. &quot;We&quot;, &quot;us&quot; and &quot;our&quot; refer to {l.legalName}.
      </p>

      <h2>2. Accounts and approval</h2>
      <ul>
        <li>You must be at least 18 and give accurate details. You are responsible for activity on your account.</li>
        <li>
          New accounts are pending until we verify your first payment. We may approve, decline or suspend an account,
          for example to prevent fraud or comply with the law.
        </li>
      </ul>

      <h2>3. Prepaid balance</h2>
      <ul>
        <li>
          Bookings are paid from a prepaid balance held in US dollars. You add funds by sending Bitcoin (BTC) or
          Litecoin (LTC) to the address shown in your wallet and submitting the transaction details.
        </li>
        <li>
          We credit your balance only after we verify the payment on the blockchain. We credit the US dollar value we
          receive at the time we verify it, which may differ from the amount you intended to send.
        </li>
        <li>
          Payments sent to the wrong address or on the wrong network may be unrecoverable. Your balance does not earn
          interest, is not transferable, and is not a bank deposit.
        </li>
        <li>
          Refunds are covered by our <Link href="/refunds">Refunds &amp; Cancellations</Link> policy.
        </li>
      </ul>

      <h2>4. Quotes and booking</h2>
      <ul>
        <li>
          Our team prices each request. A price is valid for 7 days. Accepting a quote books the shipment and deducts
          the price from your balance.
        </li>
        <li>
          Prices depend on the details you give. If the actual weight, size, contents or addresses differ, we may adjust
          the price or refuse carriage.
        </li>
      </ul>

      <h2>5. Your responsibilities</h2>
      <ul>
        <li>Pack items securely and label them correctly.</li>
        <li>
          Describe contents and value accurately, and do not ship anything on our{" "}
          <Link href="/prohibited-items">Prohibited Items</Link> list.
        </li>
        <li>Provide any customs information required and pay any duties or taxes not included in your price.</li>
      </ul>

      <h2>6. Delivery times</h2>
      <p>
        Departure and arrival dates are estimates. Delays can be caused by weather, customs, carriers and other events
        outside our control, and we are not liable for them.
      </p>

      <h2>7. Liability</h2>
      <p>
        Our liability for loss of or damage to a shipment is limited to the declared value shown on your receipt, up to
        the amount you paid for carriage unless agreed otherwise in writing. We are not liable for indirect or
        consequential losses. Claims must be made in writing within 30 days of delivery, or of the expected delivery
        date for lost shipments.
      </p>

      <h2>8. Inspection</h2>
      <p>
        We or the authorities may open and inspect any shipment, without notice, for safety, security or customs
        reasons.
      </p>

      <h2>9. Changes and governing law</h2>
      <p>
        We may update these terms; the version in force when you book applies to that booking.
        {l.governingLaw
          ? ` These terms are governed by the laws of ${l.governingLaw}, and the courts of ${l.governingLaw} have jurisdiction over any dispute.`
          : " These terms are governed by the laws of the place where we are established."}
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms? See our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
