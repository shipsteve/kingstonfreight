import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/lib/site";

export const metadata = { title: "Prohibited Items" };

const PROHIBITED = [
  "Explosives, fireworks, ammunition and firearms (including parts and replicas)",
  "Flammable liquids and gases, aerosols, lighters and fuel",
  "Corrosive, toxic, infectious or radioactive materials",
  "Lithium batteries shipped on their own (batteries installed in devices may be accepted when declared)",
  "Illegal drugs, controlled substances and drug paraphernalia",
  "Cash, coins, negotiable instruments, gift cards and precious stones or metals",
  "Live animals, plants, seeds and perishable food without prior approval",
  "Human remains or ashes",
  "Counterfeit goods and items that infringe intellectual property",
  "Hazardous waste",
  "Any item prohibited by the law of the origin, destination or transit country",
];

const RESTRICTED = [
  "Alcohol and tobacco",
  "Medicines and medical devices",
  "Perfume and cosmetics containing alcohol",
  "Electronics containing batteries",
  "High-value items such as jewelry, art and watches (declare the full value)",
];

export default function ProhibitedItemsPage() {
  return (
    <LegalPage
      title="Prohibited Items"
      intro={`For safety and legal reasons ${site.name} does not carry the items below. If you're unsure, ask us before booking.`}
    >
      <h2>We do not carry</h2>
      <ul>
        {PROHIBITED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Accepted only with approval</h2>
      <p>These need our written approval before booking and may need extra paperwork, packaging or charges:</p>
      <ul>
        {RESTRICTED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>If a prohibited item is found</h2>
      <p>
        We may refuse, hold, return or hand over the shipment to the authorities, and you are responsible for any costs,
        fines or damage that result. See our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
