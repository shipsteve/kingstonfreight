import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";
import { formatMoney } from "@/lib/money";
import { walletConfig } from "@/lib/wallet-config";

export const metadata = { title: "Refunds & Cancellations" };

export default function RefundsPage() {
  const l = legal();
  const { minTopUpCents } = walletConfig();
  return (
    <LegalPage title="Refunds & Cancellations" intro="How cancellations, refunds and your prepaid balance work.">
      <h2>Cancelling a shipment</h2>
      <ul>
        <li>
          You can ask us to cancel a shipment before it is picked up. When we cancel a shipment paid from your balance,
          the full price is returned to your balance automatically.
        </li>
        <li>
          Once a shipment has been picked up, cancellation may not be possible, or we may deduct costs already incurred
          (for example collection or customs fees).
        </li>
        <li>Shipments paid at our counter are refunded by the same method where possible.</li>
      </ul>

      <h2>Your prepaid balance</h2>
      <ul>
        <li>
          Top-ups have a minimum of {formatMoney(minTopUpCents)} and are credited in US dollars after we verify the
          payment.
        </li>
        <li>Balances are non-transferable, do not earn interest and do not expire while your account is open.</li>
        <li>
          If a payment cannot be verified (for example it was sent to the wrong address or network) we will tell you
          why. Funds sent to an address that is not ours cannot be recovered by us.
        </li>
      </ul>

      <h2>Withdrawing your balance</h2>
      <p>
        You can ask to withdraw an unused balance by contacting support. After verifying your identity we return it in
        BTC or LTC to an address you provide, at the exchange rate on the day we send it, less any network fee. We aim
        to process requests within 10 business days.
      </p>

      <h2>Lost or damaged shipments</h2>
      <p>
        Claims are handled under our <Link href="/terms">Terms of Service</Link>, limited to the declared value.
        Approved claims are paid to your balance unless agreed otherwise.
      </p>

      <h2>Questions</h2>
      <p>
        {l.supportEmail ? <>Email {l.supportEmail} or see </> : <>See </>}
        our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
