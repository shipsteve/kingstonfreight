import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const l = legal();
  return (
    <LegalPage title="Privacy Policy" intro={`How ${site.name} collects, uses and protects your information.`}>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email address and a securely hashed password.</li>
        <li>
          Shipment details: sender and recipient names, addresses, phone numbers and emails, contents, weights and
          values.
        </li>
        <li>
          Payment details: the coin, amount and transaction ID you submit. Blockchain transactions are public by nature;
          we never ask for your wallet keys.
        </li>
        <li>Technical data: your IP address, used briefly for rate limiting and security.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To price, book, transport and track shipments, and to send you emails about them.</li>
        <li>To verify payments, maintain your balance and prevent fraud.</li>
        <li>To meet legal, tax and customs obligations.</li>
      </ul>

      <h2>Who we share it with</h2>
      <ul>
        <li>Carriers, partners and customs authorities as needed to deliver your shipment.</li>
        <li>
          Service providers: our hosting and database providers, our email provider, OpenStreetMap Nominatim (we send
          only a city and country to place shipments on the tracking map), and public blockchain explorers (we send only
          a transaction ID to verify payments).
        </li>
        <li>Authorities when required by law.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Public tracking</h2>
      <p>
        Anyone with a tracking number can see its status, the origin and destination city and country, scan locations
        and estimated dates. Names, street addresses, contact details, contents and prices are never shown publicly.
      </p>

      <h2>Retention and security</h2>
      <p>
        We keep shipment and payment records for as long as needed for our services and for legal and tax purposes,
        typically seven years. We protect data with access controls, encryption in transit and hashed passwords.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask for a copy of your data, or ask us to correct or delete it where we are not required to keep it.
        Depending on your state (for example California) you may have additional rights.
        {l.supportEmail ? ` Email ${l.supportEmail} to make a request.` : " Use our contact page to make a request."}
      </p>

      <h2>Cookies</h2>
      <p>We use essential cookies to keep you signed in and remember your theme. We do not use advertising cookies.</p>

      <h2>Contact</h2>
      <p>
        {l.legalName}
        {l.address ? `, ${l.address}` : ""}. See our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
