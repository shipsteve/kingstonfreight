# Wallet, Approval, Staff Pricing, Admin Orders, Receipts & Legal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Stripe with a crypto-funded USD balance (admin-verified BTC/LTC top-ups that also approve accounts), make every quote staff-priced, let admins create orders and print QR receipts, show schedule dates in tracking, and add legal pages.

**Architecture:** An append-only `LedgerEntry` table is the only source of balances. Debits run under a per-user `SELECT … FOR UPDATE` lock inside the booking transaction. Top-ups are submitted manually and enriched by a pure on-chain parser over mempool.space and litecoinspace.org responses. Admin orders reuse the shipment model with `quoteId`/`userId` made optional. Receipts are one server component rendered on two routes.

**Tech Stack:** Existing stack (Next 16, Prisma 6, Auth.js, Vitest, Playwright) plus `qrcode`. Stripe is removed.

**Spec:** `docs/superpowers/specs/2026-10-10-wallet-admin-orders-design.md` (builds on `2026-10-09-shipping-site-mvp-design.md`)

## Global Constraints

- Money is integer cents in USD; balance = `SUM(LedgerEntry.amountCents)`. Nothing ever updates or deletes a ledger row.
- `MIN_TOPUP_USD` defaults to `50`. Coins are `BTC` and `LTC`. A coin without its `BTC_ADDRESS` / `LTC_ADDRESS` is hidden.
- Every top-up requires admin approval. The first approved top-up flips the user from PENDING to APPROVED.
- Booking needs an APPROVED account and enough balance. Payment methods are `BALANCE` and `COUNTER` only.
- Every customer quote is created `PENDING_REVIEW` with no price. There is no public pricing action.
- Public tracking never exposes names, street lines, phones, emails, prices or weights.
- `CHAIN_LOOKUP=off` and `GEOCODE_PROVIDER=off` in tests and E2E.
- Every admin action calls `requireAdmin()`. Every action returns `ActionResult` and validates with Zod.
- Company name is KingstonFreight (`site.name`).

## Review Focus

1. **Double approve / double refund**: approving the same top-up twice, or cancelling a shipment twice, must credit once. Tests in Tasks 5 and 3.
2. **Concurrent bookings on one balance**: two accepts via `Promise.all` with a balance that covers only one must book exactly one. Test in Task 3.
3. **Tx ID formatting**: `ABCDEF…` vs `abcdef…`, with surrounding spaces, is the same transaction and must be rejected as a duplicate. Test in Task 4.
4. **Lookup outage**: an explorer timing out must not block a submission; the admin can re-check. Test in Task 4.
5. **Admin order for an unknown email**: the order is stored with `customerEmail` and is claimed exactly once when that email registers, case-insensitively. Test in Task 6.

---

### Task 1: Schema migration, Stripe removal, ledger core

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`
- Create: `src/server/ledger.ts`, `tests/integration/ledger.test.ts`
- Delete: `src/server/stripe.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/api/test/complete-checkout/route.ts`, `tests/integration/test-route.test.ts`, the Stripe dependency
- Modify to compile: `src/server/shipments.ts` (drop `completeCheckout`), `src/server/actions/booking.ts` (temporarily throw "not implemented" until Task 3), shipment and quote pages (drop Pay now / AWAITING_PAYMENT), `tests/integration/booking.test.ts` (keep only tests still valid; Task 3 rewrites the rest), `.env.example` (remove `STRIPE_*`)

**Interfaces:**
- Produces:
  - Enums per spec §3.
  - Models `LedgerEntry` and `TopUp`. `User.accountStatus`, `approvedAt`, `approvedById`, `termsAcceptedAt?`.
  - Shipment additions per spec §3 (`quoteId?`, `userId?`, `customerEmail?`, `createdById?`, schedule/port/weight/contents/billTo fields). `stripeSessionId` removed.
  - `ShipmentStatus` without `AWAITING_PAYMENT`. `PaymentMethod {BALANCE, COUNTER}`. `PaymentStatus {UNPAID, PAID, REFUNDED}`.
  - `src/server/ledger.ts`:
    - `balanceCents(client: Prisma.TransactionClient | PrismaClient, userId: string): Promise<number>`
    - `lockUser(tx, userId): Promise<{ accountStatus: AccountStatus }>` (raw `SELECT … FOR UPDATE`)
    - `class InsufficientBalanceError { shortCents: number }`
    - `debitForShipment(tx, { userId, shipmentId, amountCents }): Promise<void>` (locks the user, checks the balance, writes BOOKING −amount)
    - `refundShipment(tx, shipmentId): Promise<boolean>` (writes REFUND +amount once; false if already refunded or not BALANCE)
  - Seed: the admin is created APPROVED.

- [ ] **Step 1: Failing tests** in `ledger.test.ts`:
  - The balance sums credits and debits.
  - `debitForShipment` with balance 1000 and price 1500 → `InsufficientBalanceError` with `shortCents 500`, and no entry written.
  - The same call with enough balance → one BOOKING entry of −1500.
  - `refundShipment` twice → the first returns true, the second false, and exactly one REFUND row exists.
- [ ] **Step 2:** `npm run test:int -- ledger` → FAIL.
- [ ] **Step 3:** Edit the schema and run `npx prisma migrate dev --name wallet_and_admin_orders`. Remove Stripe (`npm uninstall stripe`). Implement `ledger.ts`. Get `npx tsc --noEmit` clean.
- [ ] **Step 4:** Ledger tests PASS. The full unit + integration suite passes, with obsolete Stripe tests deleted.
- [ ] **Step 5:** Commit `feat: wallet ledger schema, remove stripe`.

### Task 2: Staff-priced quotes

**Files:**
- Modify: `src/server/actions/quotes.ts` (remove `calculatePrice`; `createQuote` always PENDING_REVIEW + "request received" email), `src/server/actions/admin-quotes.ts` (`priceQuote`, `declineQuote` for any service type), `src/server/queries/admin.ts` (`listQuotesToPrice` with `suggestedCents`), `src/app/admin/quotes/page.tsx`, `src/components/admin/FreightQuoteActions.tsx` → `QuoteActions.tsx`, `src/components/quote/QuoteStepper.tsx` (final step = Submit request), `src/app/page.tsx` + `src/components/quote/QuoteStepper.tsx` copy, `src/server/email-templates.ts` (`quoteReceivedEmail`, `quoteReadyEmail` for any service)
- Tests: `tests/integration/quotes.test.ts`, `tests/integration/admin.test.ts`

**Interfaces:**
- Consumes: `priceParcel`, `priceCourier`, `loadPricingContext`.
- Produces:
  - `priceQuote({ quoteId, priceCents, note? })`
  - `declineQuote({ quoteId, note })`
  - `suggestPrice(quote): number | null` in `src/server/rates.ts`
  - `listQuotesToPrice(): Promise<(Quote & { user, suggestedCents: number | null })[]>`

- [ ] **Step 1: Failing tests**:
  - PARCEL, COURIER and FREIGHT `createQuote` → `PENDING_REVIEW`, `priceCents null`, one email sent.
  - `priceQuote` on a PARCEL quote → PRICED + 7-day expiry.
  - `listQuotesToPrice` gives the parcel a suggested price > 0 and freight `null`.
  - A customer calling `priceQuote` → "Not authorized".
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Update the stepper: no price step. The last step shows a summary with "Submit request", and the logged-out path saves the draft and goes to login. Landing copy changes "Instant price" to "Priced by our team, usually within one business day".
- [ ] **Step 4:** Tests PASS; `tsc` and lint clean.
- [ ] **Step 5:** Commit `feat: every quote priced by staff`.

### Task 3: Booking from balance, cancellation refunds

**Files:**
- Modify: `src/server/actions/booking.ts` (rewrite `acceptQuote`), `src/server/actions/admin-shipments.ts` (refund on CANCELLED; `setPaymentStatus` only for COUNTER), quote page (balance, reason, Add funds link), `src/components/shipment/PaymentButtons.tsx` (only `AcceptQuoteButton`)
- Test: `tests/integration/booking.test.ts` (rewrite), `tests/integration/admin.test.ts`

**Interfaces:**
- Consumes: `lockUser`, `debitForShipment`, `refundShipment`, `uniqueTrackingNumber`, `attachCoordinates`.
- Produces: `acceptQuote(quoteId): Promise<ActionResult<{ shipmentId: string }>>`.

- [ ] **Step 1: Failing tests**:
  - A PENDING user → "Your account is awaiting approval. Add funds to get started."
  - An APPROVED user with balance 1000 and price 4300 → "Insufficient balance: you need $33.00 more."
  - With enough balance → BOOKED, BALANCE, PAID, one BOOKED event, a BOOKING ledger entry, balance reduced, packages and weights copied from the quote.
  - Review Focus #2: balance covers one of two quotes, `Promise.all` accept → exactly one shipment.
  - Expired, already accepted, and someone else's quote behave as before.
  - Review Focus #1: an admin cancels a BALANCE shipment → balance restored and `paymentStatus REFUNDED`; a second cancel attempt is blocked by the transition rules and the refund still happened once.
  - `setPaymentStatus` on a BALANCE shipment → "Payment for balance bookings is managed by the ledger".
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement per spec §7. Copy `packages`, `actualWeightKg` and `chargeableWeightKg` (from `billableWeightKg`) into the shipment.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `feat: book from balance, refund on cancel`.

### Task 4: On-chain lookup and customer top-ups

**Files:**
- Create: `src/server/chain.ts`, `src/server/chain.test.ts`, `src/lib/wallet-config.ts`, `src/server/actions/wallet.ts`, `src/server/queries/wallet.ts`, `src/app/(customer)/account/wallet/page.tsx`, `src/components/wallet/AddFundsForm.tsx`, `src/server/qr.ts`, `tests/integration/wallet.test.ts`
- Modify: `src/lib/route-access.ts` (+ `/account` requires login) and its test, `src/components/site/Header.tsx` (balance link), `src/server/email-templates.ts`, dashboard (pending banner)

**Interfaces:**
- Produces:
  - `walletConfig(): { minTopUpCents: number; coins: { coin: "BTC" | "LTC"; address: string }[] }`
  - `normalizeTxHash(s: string): string` (trim + lowercase)
  - `isTxHash(s): boolean` (64 hex characters)
  - `parseTx(json: unknown, ourAddress: string, tipHeight: number): { found: true; paidToUsSats: number; confirmations: number; blockTime: string | null }` (pure)
  - `lookupTx(coin, txHash): Promise<ChainCheck>` (spec §5; never throws)
  - `usdPerCoin(coin): Promise<number | null>`
  - `submitTopUp({ coin, amountCents, txHash }): Promise<ActionResult<{ id: string }>>`
  - `getMyWallet(): Promise<{ balanceCents, accountStatus, topUps, ledger } | null>`
  - `qrSvg(text: string): Promise<string>`

- [ ] **Step 1: Failing tests**:
  - Unit `chain.test.ts`, with a fixture of mempool tx JSON (`vout[].scriptpubkey_address`, `value`, `status.confirmed`, `status.block_height`, `status.block_time`):
    - Sums only our address's outputs.
    - Confirmations = tip − height + 1, and 0 when unconfirmed.
    - `lookupTx` with fetch returning 404 → `found:false`.
    - Fetch rejecting or timing out → `found:false` with an `error`.
    - The BTC explorer URL is `https://mempool.space/tx/<id>`.
    - `CHAIN_LOOKUP=off` → no fetch.
  - Integration `wallet.test.ts`:
    - Below `$50` → "Minimum top-up is $50.00".
    - A bad hash → error.
    - Coin not configured → error.
    - A valid submission → PENDING_REVIEW with a stored `chainCheck`, and an email.
    - Review Focus #3: the same hash in uppercase with spaces → "This transaction has already been submitted".
    - Review Focus #4: `lookupTx` mocked to reject → the submission still succeeds with `chainCheck.error`.
    - A suspended user → "Your account is suspended".
    - The 11th submission within an hour → rate-limited.
    - `getMyWallet` returns the balance and history only for the caller.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Wallet page: status banner, balance, Add funds (coin tabs, address text + `bitcoin:`/`litecoin:` QR, current rate, amount input, tx ID input), history tables. Add `qrcode` and `@types/qrcode`.
- [ ] **Step 4:** Tests PASS; build OK.
- [ ] **Step 5:** Commit `feat: crypto top-ups with on-chain check`.

### Task 5: Admin funding queue and account controls

**Files:**
- Create: `src/server/actions/admin-funding.ts`, `src/app/admin/funding/page.tsx`, `src/components/admin/TopUpReview.tsx`, `src/components/admin/CustomerControls.tsx`, `tests/integration/admin-funding.test.ts`
- Modify: `src/server/queries/admin.ts` (`listTopUpsToReview`, `getAdminCounts` + `topUpsToReview`, `listCustomers` with balance/status), `src/app/admin/page.tsx`, `src/app/admin/customers/page.tsx`, `src/components/admin/AdminNav.tsx`, `src/server/email-templates.ts`

**Interfaces:**
- Produces:
  - `approveTopUp({ topUpId, creditedCents })`
  - `rejectTopUp({ topUpId, note })`
  - `recheckTopUp(topUpId)`
  - `setAccountStatus({ userId, status: "APPROVED" | "SUSPENDED" })`
  - `adjustBalance({ userId, amountCents, note })` (non-zero, note required; a negative adjustment can't take the balance below 0)

- [ ] **Step 1: Failing tests**:
  - Approve → APPROVED, TOPUP ledger +credited, user PENDING→APPROVED with `approvedAt` and `approvedById`, two emails (funds added + account approved).
  - Review Focus #1: approve twice (sequential and `Promise.all`) → one ledger row; the second gets "This top-up was already reviewed".
  - Approving for an already-approved user sends one email.
  - Reject requires a note → REJECTED, no ledger row.
  - `recheckTopUp` updates `chainCheck`.
  - Suspend → that user's `acceptQuote` and `submitTopUp` fail.
  - `adjustBalance` −more than the balance → error.
  - All five actions as a customer → "Not authorized".
  - `getAdminCounts().topUpsToReview` is correct.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. The review card shows a verdict line built from `chainCheck`, an explorer link, a credit input prefilled with `min(requested, usdEstimate ?? requested)`, and Approve / Reject / Re-check.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `feat: admin funding queue and account controls`.

### Task 6: Admin orders, schedule, claim on register

**Files:**
- Create: `src/lib/admin-order-schema.ts`, `src/server/actions/admin-orders.ts`, `src/app/admin/shipments/new/page.tsx`, `src/components/admin/AdminOrderForm.tsx`, `src/components/admin/ScheduleForm.tsx`, `tests/integration/admin-orders.test.ts`
- Modify: `src/lib/pricing/weight.ts` (+ `shipmentWeights`) and its test, `src/server/actions/auth.ts` (claim shipments + `termsAcceptedAt` param from Task 9 can come later), `src/app/admin/shipments/page.tsx` (New order button), `src/app/admin/shipments/[id]/page.tsx` (schedule form, receipt button, order details), `src/server/email-templates.ts` (`orderCreatedEmail`)

**Interfaces:**
- Produces:
  - `shipmentWeights(packages: PackageInput[]): { actualKg: number; chargeableKg: number }` (actual = Σ weight×qty rounded to 0.1; chargeable = `billableWeightKg`)
  - `adminOrderSchema` (spec §8 fields; arrival ≥ departure; ports `^[A-Za-z]{3}$` uppercased; `payment: "BALANCE" | "COUNTER"`)
  - `createAdminOrder(input): Promise<ActionResult<{ shipmentId: string; trackingNumber: string }>>`
  - `updateShipmentSchedule({ shipmentId, departureDate?: string | null, estimatedArrival?: string | null })`
  - `suggestAdminOrderPrice(input)` (admin-only rate-table helper)
  - `claimShipmentsForEmail(userId, email): Promise<number>`

- [ ] **Step 1: Failing tests**:
  - `shipmentWeights([{1.2kg,10³,qty 3}, {1kg,50×40×30,qty 1}])` → `{ actualKg: 4.6, chargeableKg: 16.5 }`.
  - COUNTER order for an unknown email → BOOKED, COUNTER, PAID, `customerEmail` set, `userId` null, `createdById` = admin, an event "Booked by KingstonFreight", an email with the tracking link.
  - BALANCE order for an approved, funded user → linked, debited.
  - BALANCE order for an unknown email → "Charging a balance needs an existing approved customer".
  - BALANCE order with insufficient funds → error with the short amount.
  - Arrival before departure → error.
  - Review Focus #5: `registerUser` with that email in a different case → the shipment's `userId` is set; registering a second account can't claim it again.
  - `updateShipmentSchedule` sets and clears dates.
  - A customer calling these actions → "Not authorized".
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. The form uses existing `AddressFields` (plus phone and email inputs) and `PackageFields` with live weight totals, and a "Use rate table" button calling `suggestAdminOrderPrice`.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `feat: admin orders with schedule`.

### Task 7: Receipts with QR

**Files:**
- Create: `src/lib/receipt.ts` (`trackingUrl(trackingNumber): string` from `APP_URL`), `src/lib/receipt.test.ts`, `src/components/receipt/ReceiptView.tsx`, `src/components/receipt/PrintButton.tsx`, `src/app/admin/shipments/[id]/receipt/page.tsx`, `src/app/(customer)/shipments/[id]/receipt/page.tsx`, `src/server/queries/receipt.ts`, `tests/integration/receipt.test.ts`
- Modify: `src/app/globals.css` (print rules), customer shipment page (Print receipt link)

**Interfaces:**
- Produces:
  - `getReceiptForAdmin(id)` and `getReceiptForOwner(id)`, both returning `ReceiptData | null`
  - `type ReceiptData` (shipment + addresses + pieces + weights + charges + issuedBy + issuedAt)
  - `<ReceiptView data qrSvg />`

- [ ] **Step 1: Failing tests**:
  - Unit: `trackingUrl("SHP-ABCD234567")` with `APP_URL=https://kingstonfreight.com/` → `https://kingstonfreight.com/track/SHP-ABCD234567` (no double slash).
  - Integration: `getReceiptForOwner` returns null for another user. The admin version returns full addresses, pieces, weights, price and payment method.
  - `qrSvg(trackingUrl(...))` returns a string starting with `<svg`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the receipt layout (spec §9) and `@media print` rules (hide `header, footer, nav, .no-print`; `@page { margin: 12mm }`; force light colours).
- [ ] **Step 4:** Tests PASS. Take a screenshot of the receipt and read it.
- [ ] **Step 5:** Commit `feat: printable receipts with QR`.

### Task 8: Tracking shows schedule

**Files:**
- Modify: `src/server/tracking.ts`, `tests/integration/tracking.test.ts`, the tracking page, dashboard, customer shipment page, `src/components/shipment/ScheduleLine.tsx` (new)

**Interfaces:**
- Produces: `PublicTracking` + `departureDate: Date | null`, `estimatedArrival: Date | null`, `transportMode`, `departurePort`, `arrivalPort`; `<ScheduleLine />`.

- [ ] **Step 1: Failing tests**:
  - Tracking returns the dates and ports.
  - The PII test extended: the JSON has no `weight`, `contents`, `declaredValue`, `customerEmail` or `phone`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** Commit `feat: schedule dates in tracking`.

### Task 9: Legal pages and terms acceptance

**Files:**
- Create: `src/lib/legal.ts` (`legal(): { legalName, address, supportEmail, supportPhone?, governingState, lastUpdated }` from env with safe defaults), `src/app/(public)/{terms,privacy,refunds,prohibited-items,contact}/page.tsx`, `src/components/legal/LegalPage.tsx`
- Modify: `src/components/site/Footer.tsx`, `src/components/auth/AuthForm.tsx` (checkbox), `src/server/actions/auth.ts` (`acceptTerms: true` required → `termsAcceptedAt`), `tests/integration/auth.test.ts`, `.env.example`, README

**Interfaces:**
- Produces: `registerUser({ name, email, password, acceptTerms })`.

- [ ] **Step 1: Failing tests**:
  - Register without `acceptTerms` → "Please accept the Terms of Service and Privacy Policy".
  - With it → `termsAcceptedAt` set.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the pages. Content covers:
  - **Terms:** service, accounts and approval, prepaid balance, pricing by quote, liability limited to declared value, prohibited items, claims window, governing law.
  - **Privacy:** what is collected, Nominatim and explorer lookups, emails, retention, contact.
  - **Refunds:** cancellations refund to balance; balances are non-transferable; withdrawal requests are handled by support.
  - **Prohibited items:** hazardous materials, weapons, cash, etc.
  - **Contact.**
- [ ] **Step 4:** Tests PASS; footer links render.
- [ ] **Step 5:** Commit `feat: legal pages and terms acceptance`.

### Task 10: E2E, docs, deploy readiness

**Files:**
- Rewrite: `tests/e2e/parcel-flow.spec.ts` → `tests/e2e/customer-flow.spec.ts`, `tests/e2e/freight-flow.spec.ts` → `tests/e2e/admin-order.spec.ts`, `tests/e2e/helpers.ts`
- Modify: `scripts/e2e-server.ts` (`CHAIN_LOOKUP=off`, test BTC/LTC addresses, legal env), `README.md`, `.env.example`

- [ ] **Step 1: Specs**:
  - **customer-flow:**
    1. Register (accept terms) → dashboard shows the pending banner.
    2. Wallet → submit $60 BTC with a random 64-hex tx → status "Under review".
    3. Admin approves → the customer's balance shows $60.00 and the account is approved.
    4. Customer submits a parcel quote → admin prices it at $25.00 → the customer accepts.
    5. The balance shows $35.00, and `/track/<n>` shows Booked.
  - **admin-order:**
    1. Admin creates a COUNTER order with departure and arrival dates and two pieces.
    2. Opens the receipt and asserts the tracking number, chargeable weight and QR `<svg>` are present.
    3. Visits `trackingUrl` → sees the "Estimated arrival" date.
  - **fallback.spec** unchanged.
- [ ] **Step 2:** `npx playwright test` → PASS.
- [ ] **Step 3:** README: wallet setup, addresses, approval workflow, legal-page variables and the lawyer-review note, no Stripe.
- [ ] **Step 4:** Full suite: unit + integration + e2e + build → green. Lighthouse on `/` stays ≥ 85.
- [ ] **Step 5:** Commit `test: e2e for wallet and admin orders; docs`.
