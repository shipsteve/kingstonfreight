# Wallet Funding, Account Approval, Admin Orders & Receipts — Design Spec

Date: 2026-10-10
Status: Approved 2026-10-10, with amendments (manual pricing for every quote, legal pages)
Builds on: `2026-10-09-shipping-site-mvp-design.md`

## 1. Goal

Customers prepay a USD balance with **BTC or LTC** sent to KingstonFreight's own wallet addresses. An admin verifies each payment before it is credited, and the first approved top-up also **approves the account**. Only approved accounts with enough balance can book. Admins can also create orders themselves (counter/phone customers) and print a branded **receipt with a QR code** that opens public tracking.

**Success criteria**
- A new customer can register → submit a ≥ $50 BTC/LTC top-up → admin approves → account becomes Approved with that balance → customer books and the price is deducted.
- Admins see an on-chain check for every submitted transaction (amount to our address, confirmations, USD estimate) without leaving the site.
- No booking can overspend a balance, including two at the same instant.
- An admin can create an order with pieces/weights and departure/arrival dates, charge it to a customer's balance or record it as paid at the counter, and print a receipt whose QR code opens the tracking page.
- Customers and the public see departure and estimated arrival dates in tracking.

## 2. Decisions (from the brainstorm)

| Topic | Decision |
|---|---|
| Coins | BTC and LTC |
| How funds arrive | Customer sends to company addresses (`BTC_ADDRESS`, `LTC_ADDRESS`), then submits coin + USD amount + transaction ID. NOWPayments comes later (§12). |
| Verification | **Every** top-up is approved by an admin, helped by an automatic on-chain lookup |
| Minimum top-up | $50 (`MIN_TOPUP_USD`) |
| Account approval | Accounts start **Pending**; first approved top-up → **Approved**. Admin can **Suspend**. |
| How bookings are paid | **Balance only**, for parcel, courier and freight. Stripe and freight invoicing are removed. |
| Admin-created orders | Admin chooses **Charge customer's balance** or **Paid at counter** |
| Order ↔ customer link | By customer email; if no account yet, the shipment is claimed when that email registers |
| **Pricing (amendment)** | **No instant prices.** Every quote request, for parcel, courier and freight, is priced by an admin after submission (§7a) |
| Country / currency | US / USD (unchanged) |
| **Legal pages (amendment)** | Terms, Privacy, Refunds & Cancellations, Prohibited Items, Contact (§10a) |

## 3. Data model changes

```
enum AccountStatus   PENDING | APPROVED | SUSPENDED
enum LedgerKind      TOPUP | BOOKING | REFUND | ADJUSTMENT
enum Coin            BTC | LTC
enum TopUpMethod     MANUAL                     -- NOWPAYMENTS added later
enum TopUpStatus     PENDING_REVIEW | APPROVED | REJECTED
enum PaymentMethod   BALANCE | COUNTER          -- replaces CARD | INVOICE
enum PaymentStatus   UNPAID | PAID | REFUNDED   -- adds REFUNDED
enum TransportMode   AIR | SEA | ROAD
enum BillTo          SENDER | RECIPIENT | THIRD_PARTY
ShipmentStatus       AWAITING_PAYMENT removed (booking is paid instantly)

User        + accountStatus AccountStatus @default(PENDING), approvedAt?, approvedById?
              (seeded admin is APPROVED)

LedgerEntry id, userId, amountCents Int (signed: + credit, − debit), kind,
            topUpId? @unique, shipmentId?, note?, createdById?, createdAt
            @@unique([shipmentId, kind])   -- at most one BOOKING and one REFUND per shipment
            -- append-only: no update/delete code paths

TopUp       id, userId, method, coin, txHash, requestedCents, creditedCents?,
            status, chainCheck Json?, adminNote?, reviewedById?, reviewedAt?, createdAt
            @@unique([coin, txHash])

Shipment    quoteId → optional (admin orders have no quote)
            userId  → optional; + customerEmail? (claim on register)
            + createdById?                       -- admin who created it
            + transportMode?, departurePort?, arrivalPort?   (3-letter IATA codes)
            + departureDate?, estimatedArrival?
            + packages Json?, actualWeightKg?, chargeableWeightKg?
            + contents?, declaredValueCents?, goodsOriginCountry?, hsCode?, billTo?
            - stripeSessionId

Address JSON  + email? (optional, shown on receipt only)
```

**Balance** = `SUM(amountCents)` over the user's ledger entries. It is never stored separately.

Customer-booked shipments copy `packages` and both weights from their quote, so every shipment can print a receipt.

## 4. Top-up flow (customer)

**Wallet page `/account/wallet`** (login required):
- Balance, account status banner ("Pending: your account is approved after your first top-up is verified"), and full history of top-ups and ledger entries.
- **Add funds**: choose BTC or LTC → the page shows our address as text plus a QR code (`bitcoin:` / `litecoin:` URI) and the current USD rate → the customer sends funds → submits USD amount (≥ $50) and transaction ID (64 hex characters).
- On submit: validate, reject a `(coin, txHash)` already claimed, run the on-chain lookup (§5), store the result in `chainCheck`, create the TopUp as **PENDING_REVIEW**, and email the customer "Payment received, under review".
- Rate limit: 10 submissions per user per hour.

## 5. On-chain lookup (`src/server/chain.ts`)

`lookupTx(coin, txHash): Promise<ChainCheck>`

```
ChainCheck = {
  found: boolean,
  paidToUsSats: number,        // sum of outputs to our address for this coin
  confirmations: number,
  blockTime: string | null,
  usdEstimateCents: number | null,  // paidToUs × current price
  explorerUrl: string,
  checkedAt: string,
  error?: string
}
```

- BTC: `https://mempool.space/api/tx/{txid}` and `/api/blocks/tip/height`. LTC: the same API at `https://litecoinspace.org`.
- Price: CoinGecko simple price (`bitcoin`, `litecoin` in USD), cached for 5 minutes.
- Timeout 4 s per call. Failures produce `{ found: false, error }`, and the admin can **Re-check** later. A lookup never blocks a submission.
- Explorer links: `https://mempool.space/tx/{id}` and `https://litecoinspace.org/tx/{id}`.

## 6. Admin funding queue `/admin/funding`

- Lists PENDING_REVIEW top-ups, oldest first: customer (with account status), coin, requested USD, transaction ID, and the chain check rendered as a verdict:
  - ✅ *"0.00081 BTC to our address · 3 confirmations · ≈ $54.20"*
  - ⚠️ not found / unconfirmed / paid to a different address / amount below requested
- **Re-check** re-runs the lookup.
- **Approve**: credit amount in USD (prefilled with the smaller of requested and on-chain estimate, editable, > 0). In one transaction:
  - TopUp PENDING_REVIEW → APPROVED (compare-and-set)
  - TOPUP ledger entry
  - if the user is PENDING → APPROVED
  - Then email "Funds added" (+ "Account approved" on first approval).
- **Reject**: note required → REJECTED, email the customer with the note.
- The admin overview gains a **"Top-ups to review"** count.

**Customers page** additions: status, balance, and actions **Approve account**, **Suspend / Unsuspend**, and **Adjust balance** (± USD with a required note → ADJUSTMENT entry).

## 7. Booking with balance

`acceptQuote` (replaces the card/invoice paths). In one transaction:
1. Lock the customer row (`SELECT … FOR UPDATE`). This serializes concurrent debits per user.
2. Require `accountStatus = APPROVED`, otherwise fail with *"Your account is awaiting approval. Add funds to get started."*
3. Compute the balance. If it is below the price, fail with *"Insufficient balance: you need $X more."*
4. Run the existing quote compare-and-set (PRICED, unexpired) → ACCEPTED.
5. Create the shipment as **BOOKED**, `paymentMethod BALANCE`, `paymentStatus PAID`, with a BOOKED event.
6. Write a BOOKING ledger entry for −price.

Then email the booking confirmation.

The quote page shows the balance, and when booking isn't possible it shows the reason with an **Add funds** button.

**Cancellation refund**: when an admin moves a BALANCE-paid shipment to CANCELLED, the same transaction writes a REFUND entry for +price (unique per shipment) and sets `paymentStatus REFUNDED`.

**Admin "mark paid/unpaid"** is allowed only for COUNTER shipments. For BALANCE shipments the ledger is the source of truth.

**Removed**: Stripe (`stripe.ts`, webhook route, `startPayment`, Pay now button, the E2E checkout stand-in route), `STRIPE_*` env vars, and invoice wording in emails.

## 7a. Quotes are priced by staff (amendment)

- **Customer flow.** The quote stepper keeps its steps (service → addresses → packages/details), but the last step is **Submit request** for every service. No price is shown. Login is required to submit; the draft still survives the login redirect.
- **Status.** Every submitted quote is **PENDING_REVIEW**, and the customer is emailed "We've received your request".
- **Removed.** The public `calculatePrice` action and its rate limit, and instant-price wording on the landing page and stepper (copy becomes "Our team prices every shipment, usually within one business day").
- **Admin "Quotes to price" queue.** This replaces the freight-only queue in `/admin/quotes` and shows all service types. For parcel and courier it shows a **suggested price** from the existing rate tables as a hint. The admin enters the final price and an optional note. `priceQuote` (renamed from `priceFreightQuote`) now accepts any service type. Decline is unchanged.
- **Rate tables** stay on the admin pricing page as the source of suggested prices and of the **Use rate table** button on admin orders. Customers never see them.
- **Flow after pricing.** The customer gets the "Your quote is ready" email (now for all services) → accepts within 7 days → balance debit (§7).

## 8. Admin orders `/admin/shipments/new`

Form sections:
- **Customer email.** The admin sees the account status and balance if the email matches a user.
- **Sender** and **Recipient**: name, address, phone, email.
- **Service**: Parcel / Courier / Freight; mode Air/Sea/Road; departure and arrival port codes (optional, 3 letters).
- **Dates**: departure date and estimated arrival (both optional; arrival must not be before departure).
- **Pieces**: one or more lines of weight and dimensions × quantity. Actual and chargeable weight are shown live.
- **Contents**: description, declared value (USD), country of origin of goods, HS code (optional).
- **Charges**:
  - Price (USD), or **Use rate table** for parcel/courier.
  - Bill to: Sender / Recipient / Third party.
  - Payment: **Charge customer's balance** (requires an existing APPROVED account with funds; same locked debit as §7) or **Paid at counter**.

`createAdminOrder(input)` creates the shipment as **BOOKED**, with `createdById`, linked to the user if the email matches (otherwise `customerEmail`). It writes the BOOKED event "Booked by KingstonFreight" and emails the customer the tracking link, then redirects to the admin shipment page.

**Claim on register**: `registerUser` attaches shipments where `userId IS NULL AND customerEmail = <email>`.

**Admin shipment page** additions: a **Schedule** form (departure / estimated arrival), a **Print receipt** button, and the payment method with ledger reference.

## 9. Receipt

- **Routes**: `/admin/shipments/[id]/receipt` (admin) and `/shipments/[id]/receipt` (owner only).
- **Shared `ReceiptView`** (server-rendered):
  - KingstonFreight header, date issued, issued by
  - Tracking number in large type plus a **QR code** (SVG via `qrcode`) encoding `${APP_URL}/track/<number>`
  - Sender and recipient blocks
  - Service, mode, ports, departure and estimated arrival
  - Pieces table: qty, weight, dimensions; totals for actual and chargeable weight
  - Contents, declared value, country of origin, HS code
  - Charges: price, bill to, payment method and status
  - Footer: "Liability is limited to the declared value. Track at <url>."
- **Print CSS**: Letter/A4, header/footer/nav hidden, black-on-white, and a **Print** button (`window.print()`).

## 10. Tracking changes

- `PublicTracking` adds `departureDate`, `estimatedArrival`, `transportMode`, `departurePort`, `arrivalPort`. Still no names, street lines, phones, emails, prices or weights.
- The tracking page, dashboard and shipment page show "Departs <date> · Estimated arrival <date>" when set.

## 10a. Legal pages (amendment)

- **Routes**: `/terms`, `/privacy`, `/refunds` (refunds & cancellations, including how prepaid balances and cancelled shipments are refunded to balance), `/prohibited-items`, `/contact` (about + contact details).
- **Content.** Plain-language templates written for a US shipping business that holds prepaid crypto-funded balances. They are filled from settings, so there is no hard-coded company data:

  | Variable | Example |
  |---|---|
  | `COMPANY_LEGAL_NAME` | KingstonFreight LLC |
  | `COMPANY_ADDRESS` | street, city, state, ZIP |
  | `SUPPORT_EMAIL` | support@… |
  | `SUPPORT_PHONE` | optional |
  | `GOVERNING_STATE` | e.g. New York |

  Each page shows "Last updated <date>".
- **Sign-up** requires ticking "I agree to the Terms of Service and Privacy Policy" (links open in new tabs). `User.termsAcceptedAt` is recorded.
- **Footer** links to all five pages. The wallet page links to the Refunds page.
- **Review.** The README tells the owner the templates are a starting point and must be reviewed by a lawyer. The pages themselves contain no "template" wording.

## 11. Security & integrity

- All money is integer cents. The ledger is append-only, and every admin money action records `createdById` / `reviewedById`.
- `(coin, txHash)` is unique, so a transaction can be claimed only once.
- Debits run under a per-user row lock. TopUp approval and shipment cancellation use compare-and-set, so double-clicks cannot double-credit or double-refund (also enforced by the unique constraints).
- Suspended users cannot book or submit top-ups, but can view their history.
- Every admin action calls `requireAdmin()`.
- Chain lookups send only the transaction ID to public explorers.

## 12. Later: NOWPayments (not built now)

The model is ready for it:
- Add `TopUpMethod.NOWPAYMENTS` and an IPN route `/api/nowpayments/ipn` (HMAC-SHA512 signature check, idempotent by payment id).
- Confirmed payments for APPROVED accounts would credit automatically; first top-ups still go to the queue.
- Nothing in the customer or admin UI needs restructuring.

## 13. Settings

| Variable | Default | Purpose |
|---|---|---|
| `BTC_ADDRESS` | — (required for BTC) | Company BTC receiving address |
| `LTC_ADDRESS` | — (required for LTC) | Company LTC receiving address |
| `MIN_TOPUP_USD` | `50` | Minimum top-up |
| `CHAIN_LOOKUP` | on (`off` in tests/E2E) | Enables explorer and price calls |

A coin whose address isn't set is hidden from the wallet page.
The legal-page variables in §10a also live here.

## 14. Testing

- **Unit**
  - Chain lookup parsing: mempool-style tx JSON → sats to our address; confirmations from tip height; not found; timeout.
  - Weight totals.
  - Receipt QR URL.
  - Date validation.
- **Integration**
  - Every quote type is created PENDING_REVIEW with no price.
  - `priceQuote` prices parcel, courier and freight.
  - Registration requires terms acceptance and stores `termsAcceptedAt`.
  - Ledger balance math.
  - Booking with insufficient balance fails; concurrent bookings cannot overspend (`Promise.all`).
  - A PENDING account cannot book; a SUSPENDED account cannot book or top up.
  - Top-up below minimum rejected; duplicate tx rejected.
  - Approve credits once (double approve → second fails) and approves a PENDING account; reject records the note.
  - Cancel refunds once.
  - Admin order: balance vs counter; email link; claim on register.
  - Every new admin action denied to customers.
  - Public tracking still leaks no PII.
- **E2E**
  1. Register (accepting terms) → wallet → submit top-up → admin approves in the funding queue → customer submits a parcel quote → admin prices it → customer accepts → balance reduced → track.
  2. Admin creates an order (counter) with dates → prints the receipt → the QR target URL opens tracking showing the dates.

## 15. Out of scope

Instant/automatic customer pricing (removed by amendment), password reset and email verification (recommended before launch, not requested yet), NOWPayments (§12), withdrawals/refunds to crypto, other coins, payment screenshot uploads, multi-currency balances, automated low-balance emails, carrier-format labels (FedEx/USPS barcodes), commercial invoices.

## 16. Compliance note

Holding prepaid customer balances, especially funded in crypto, may fall under money-transmitter or e-money rules where KingstonFreight operates. The owner should confirm with an accountant or lawyer before launch. The design keeps a full, auditable ledger to support that.
