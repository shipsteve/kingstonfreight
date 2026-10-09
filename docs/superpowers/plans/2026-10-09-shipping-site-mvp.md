# Shipping Site MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js app where customers quote, book, pay for, and track parcel/courier/freight shipments, and admins run operations from `/admin`.

**Architecture:** One Next.js App Router app. Pure pricing/tracking logic in `src/lib` (no I/O, unit-tested). Server Actions in `src/server/actions` do auth → Zod validation → Prisma → side effects (Stripe, email). UI layers on top: shadcn/ui for forms/tables, Framer Motion + animated cards for the public site, a lazy-loaded react-three-fiber globe on landing and tracking.

**Tech Stack:** Next.js (App Router, TS), Tailwind, shadcn/ui, Prisma + PostgreSQL (Neon), Auth.js v5 (Credentials, JWT), Stripe Checkout, Resend, Framer Motion (`motion`), three.js + `@react-three/fiber` + `@react-three/drei`, Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-shipping-site-mvp-design.md`

## Global Constraints

- `HOME_COUNTRY` default `US`; `CURRENCY` default `USD`; money stored as integer cents everywhere.
- Units kg / cm / km. Volumetric divisor `5000`. Quote validity `7` days.
- Tracking numbers: `SHP-` + 10 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Every Server Action returns `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` and validates input with Zod.
- Every customer-data read/write checks ownership server-side; every admin action calls `requireAdmin()`.
- Price is always read from the DB quote, never from the client.
- Public tracking exposes city + country only — no price, names, phone, street lines.
- 3D: `next/dynamic` with `ssr: false`, error boundary, DPR ≤ 2, static fallback when no WebGL / width < 768px / `prefers-reduced-motion`.
- `MotionConfig reducedMotion="user"` wraps the app.
- Email send failures are logged, never thrown to the user.
- Import alias `@/` → `src/`.

## Review Focus

1. **Postcode formatting** — `"sw1a 1aa"`, `"SW1A1AA"`, `" 10001 "` must resolve to the same zone (normalize: uppercase, strip whitespace). Test in Task 3.
2. **Double accept / expired accept** — accepting the same quote twice yields one shipment; accepting an expired quote fails with a clear error. Test in Task 7.
3. **Duplicate Stripe webhook** — the same `checkout.session.completed` delivered twice creates one TrackingEvent and one email. Test in Task 7.
4. **Cross-customer access by ID** — customer B fetching/accepting customer A's quote or shipment gets "Not found". Test in Task 6 and Task 7.
5. **Tracking lookup formatting** — `"shp-abcd234567"` and `" SHP-ABCD234567 "` find the shipment; unknown number shows a friendly not-found, not a 500. Test in Task 10.

## Prerequisites (human)

- Node 20+, a Postgres database for dev (Neon) and a **separate** one for tests (`DATABASE_URL_TEST`).
- Stripe test-mode keys + Stripe CLI for local webhooks. Resend key optional (emails log to console without it).

---

### Task 1: Scaffold, config, test harness

**Files:**
- Create: Next.js app at repo root (`create-next-app` with TS, Tailwind, App Router, `src/`, alias `@/*`), `src/lib/config.ts`, `src/server/result.ts`, `vitest.config.ts`, `.env.example`, `src/lib/config.test.ts`
- Init shadcn/ui (`npx shadcn@latest init`) and add: button, input, label, card, table, dialog, select, badge, form, sonner, tabs

**Interfaces:**
- Produces: `config: { homeCountry: string; currency: string; volumetricDivisor: 5000; quoteValidityDays: 7 }`; `type ActionResult<T>`; helpers `ok<T>(data: T): ActionResult<T>`, `fail(error: string): ActionResult<never>`; `formatMoney(cents: number): string` in `src/lib/money.ts`

- [ ] **Step 1:** Scaffold the app into the existing repo root (keep `docs/`). Add Vitest (`vitest`, `vite-tsconfig-paths`, environment `node`), scripts `test`, `test:unit`, `test:int`.
- [ ] **Step 2: Write failing tests** `config.test.ts`: with no env vars → `homeCountry === 'US'`, `currency === 'USD'`; with `HOME_COUNTRY=gb` → `'GB'` (uppercased). `money.test.ts`: `formatMoney(123456) === '$1,234.56'`, `formatMoney(0) === '$0.00'`.
- [ ] **Step 3:** Run `npm run test:unit` → FAIL (modules missing).
- [ ] **Step 4:** Implement `config.ts`, `money.ts` (Intl.NumberFormat with `config.currency`), `result.ts`. `.env.example` lists every env var used in this plan.
- [ ] **Step 5:** `npm run test:unit` → PASS; `npm run build` → succeeds.
- [ ] **Step 6:** Commit `chore: scaffold next app, config, vitest`.

### Task 2: Database schema, client, seed, integration harness

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `src/server/db.ts`, `tests/integration/setup.ts`, `tests/integration/seed.test.ts`, `vitest.integration.config.ts`

**Interfaces:**
- Produces: Prisma models exactly per spec §5 — `User`, `Zone`, `ParcelRate`, `CourierRate`, `Quote`, `Shipment`, `TrackingEvent`; enums `Role`, `ZoneKind`, `ServiceType`, `QuoteStatus`, `ShipmentStatus` (`AWAITING_PAYMENT BOOKED PICKED_UP IN_TRANSIT CUSTOMS OUT_FOR_DELIVERY DELIVERED EXCEPTION CANCELLED`), `PaymentMethod`, `PaymentStatus`. Address/packages/freightDetails as `Json`. `Shipment.quoteId @unique`, `Shipment.trackingNumber @unique`, `@@unique([originZoneId, destZoneId, maxWeightKg])` on ParcelRate.
- `db` — singleton PrismaClient (globalThis cache in dev).
- `tests/integration/setup.ts` — globalSetup: runs `prisma migrate reset --force --skip-seed` against `DATABASE_URL_TEST`; exports `resetDb()` that truncates all tables between tests.
- Seed: admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (bcrypt), zones `US-East` (prefixes 0–4), `US-West` (5–9), `Europe` (GB, FR, DE, NL, ES, IT), `Asia` (CN, JP, SG, IN), `Rest of World` (empty list = fallback, see Task 3); a 0.5/1/2/5/10/20/30 kg band set for every zone pair; courier rate base 1500, perKm 150, maxKm 100.

- [ ] **Step 1: Failing test** `seed.test.ts`: after running the exported `seed(db)` function → exactly 1 ADMIN user, 5 zones, `25 × 7 = 175` parcel rates, 1 courier rate; running `seed(db)` twice keeps the same counts (idempotent upserts).
- [ ] **Step 2:** `npm run test:int` → FAIL.
- [ ] **Step 3:** Write schema, `npx prisma migrate dev --name init`, implement `seed.ts` exporting `seed(db)` + CLI entry, `db.ts`.
- [ ] **Step 4:** `npm run test:int` → PASS.
- [ ] **Step 5:** Commit `feat: prisma schema, seed, integration harness`.

### Task 3: Pricing — weight and zones

**Files:**
- Create: `src/lib/pricing/types.ts`, `src/lib/pricing/weight.ts`, `src/lib/pricing/zones.ts`, tests alongside (`*.test.ts`)

**Interfaces:**
- Produces (types.ts):
  ```ts
  type Address = { name: string; line1: string; line2?: string; city: string; postcode: string; countryCode: string; phone?: string }
  type PackageInput = { weightKg: number; lengthCm: number; widthCm: number; heightCm: number; qty: number }
  type ZoneDef = { id: string; kind: 'DOMESTIC' | 'INTERNATIONAL'; postcodePrefixes: string[]; countryCodes: string[] }
  type ParcelRateDef = { originZoneId: string; destZoneId: string; maxWeightKg: number; priceCents: number }
  type CourierRateDef = { baseFeeCents: number; perKmCents: number; maxKm: number }
  type PriceFailReason = 'NO_ORIGIN_ZONE' | 'NO_DEST_ZONE' | 'NO_RATE' | 'TOO_HEAVY' | 'NOT_DOMESTIC' | 'TOO_FAR'
  type PriceResult = { ok: true; priceCents: number; billableKg?: number } | { ok: false; reason: PriceFailReason }
  ```
- `billableWeightKg(packages: PackageInput[], divisor?: number): number`
- `normalizePostcode(p: string): string`
- `resolveZone(addr: { countryCode: string; postcode: string }, zones: ZoneDef[], homeCountry: string): ZoneDef | null`

- [ ] **Step 1: Failing tests**
  - `billableWeightKg([{weightKg:2,lengthCm:10,widthCm:10,heightCm:10,qty:1}]) === 2` (actual wins)
  - `billableWeightKg([{weightKg:1,lengthCm:50,widthCm:40,heightCm:30,qty:1}]) === 12` (60000/5000)
  - `billableWeightKg([{weightKg:1.2,...10x10x10,qty:3}]) === 4.5` (1.2→1.5 per package, ×3)
  - `normalizePostcode(' sw1a 1aa ') === 'SW1A1AA'`
  - Domestic: postcode `'10001'` → US-East; `'94105'` → US-West; with prefixes `['9','941']`, `'94105'` matches the `'941'` zone (longest prefix)
  - International: `{countryCode:'fr'}` → Europe; country in no zone → the INTERNATIONAL zone with empty `countryCodes` (Rest of World) if one exists, else `null` (DOMESTIC zones never act as fallback)
  - Home-country address with unmatched postcode → `null`
- [ ] **Step 2:** `npx vitest run src/lib/pricing` → FAIL.
- [ ] **Step 3:** Implement. Round per package up to nearest 0.5 kg before multiplying by qty. Country codes compared uppercased.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `feat: pricing weight and zone resolution`.

### Task 4: Pricing — parcel and courier; tracking primitives

**Files:**
- Create: `src/lib/pricing/parcel.ts`, `src/lib/pricing/courier.ts`, `src/lib/tracking/number.ts`, `src/lib/tracking/status.ts`, tests alongside

**Interfaces:**
- Consumes: Task 3 types, `billableWeightKg`, `resolveZone`
- Produces:
  - `priceParcel(input: { origin: Address; destination: Address; packages: PackageInput[] }, ctx: { zones: ZoneDef[]; rates: ParcelRateDef[]; homeCountry: string }): PriceResult`
  - `priceCourier(input: { origin: Address; destination: Address; distanceKm: number }, rate: CourierRateDef, homeCountry: string): PriceResult`
  - `generateTrackingNumber(rand?: () => number): string`; `normalizeTrackingNumber(s: string): string`; `isTrackingNumber(s: string): boolean`
  - `canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean`; `ADMIN_SETTABLE_STATUSES: ShipmentStatus[]`; `TERMINAL_STATUSES = ['DELIVERED','CANCELLED']`

- [ ] **Step 1: Failing tests**
  - Parcel: 3 kg US-East→Europe with bands 2/5/10 priced 1000/2000/3000 → `{ok:true, priceCents:2000, billableKg:3}`; exactly 5 kg → 2000 (band is `≥`); 31 kg with max band 30 → `{ok:false, reason:'TOO_HEAVY'}`; zone pair with no rates → `'NO_RATE'`; unresolvable origin → `'NO_ORIGIN_ZONE'`
  - Courier (base 1500, perKm 150, max 100): 12.3 km domestic → `1500 + 13*150 = 3450`; destination `FR` → `'NOT_DOMESTIC'`; 101 km → `'TOO_FAR'`
  - Tracking: `generateTrackingNumber()` matches `/^SHP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/`; `normalizeTrackingNumber(' shp-abcd234567 ') === 'SHP-ABCD234567'`; `isTrackingNumber('SHP-ABC') === false`
  - Status: `canTransition('BOOKED','IN_TRANSIT') === true`; `canTransition('DELIVERED','IN_TRANSIT') === false`; `canTransition('CANCELLED','BOOKED') === false`; `canTransition('IN_TRANSIT','EXCEPTION') === true`; `canTransition('EXCEPTION','OUT_FOR_DELIVERY') === true`; `canTransition('AWAITING_PAYMENT','PICKED_UP') === false` (must be paid/booked first; admin can only go AWAITING_PAYMENT → BOOKED or CANCELLED)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Transition rule: from a terminal status → nothing; from `AWAITING_PAYMENT` → `BOOKED | CANCELLED`; otherwise → any non-`AWAITING_PAYMENT` status other than itself. Use `crypto.getRandomValues` for the default rand.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: parcel/courier pricing and tracking primitives`.

### Task 5: Auth

**Files:**
- Create: `src/server/auth.ts`, `src/server/session.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/server/actions/auth.ts`, `src/app/(public)/login/page.tsx`, `src/app/(public)/register/page.tsx`, `src/types/next-auth.d.ts`, `tests/integration/auth.test.ts`

**Interfaces:**
- Produces:
  - `auth`, `signIn`, `signOut`, `handlers` from `src/server/auth.ts` (Credentials provider; JWT session carrying `id` and `role`)
  - `getCurrentUser(): Promise<{ id: string; email: string; role: 'CUSTOMER' | 'ADMIN' } | null>`, `requireUser()`, `requireAdmin()` in `src/server/session.ts` — the latter two throw `UnauthorizedError` (exported). **All later integration tests mock this module** via `vi.mock('@/server/session')`.
  - `registerUser(input: { name: string; email: string; password: string }): Promise<ActionResult<{ id: string }>>`
  - Middleware: `/dashboard`, `/quotes/*`, `/shipments/*` require login → redirect `/login?next=<path>`; `/admin/*` requires ADMIN → redirect `/`.

- [ ] **Step 1: Failing tests:** register creates a CUSTOMER with bcrypt hash (not plaintext); email stored lowercased; duplicate email (any case) → `{ok:false, error:'Email already registered'}`; password < 8 chars → `ok:false`; `authorizeCredentials(email, password)` (exported from auth.ts for testing) returns user for correct password, `null` for wrong.
- [ ] **Step 2:** `npm run test:int -- auth` → FAIL.
- [ ] **Step 3:** Implement. Login/register pages use shadcn form; login honors `?next=`.
- [ ] **Step 4:** Tests PASS; manual: register, log in, visit `/admin` as customer → redirected.
- [ ] **Step 5:** Commit `feat: auth with credentials, roles, route protection`.

### Task 6: Quotes — schema, actions, quote stepper UI

**Files:**
- Create: `src/lib/quote-schema.ts`, `src/server/actions/quotes.ts`, `src/server/rates.ts`, `src/app/(public)/quote/page.tsx`, `src/components/quote/QuoteStepper.tsx` (+ step components), `tests/integration/quotes.test.ts`, `src/lib/quote-schema.test.ts`

**Interfaces:**
- Consumes: `priceParcel`, `priceCourier`, `requireUser`, `getCurrentUser`, `db`
- Produces:
  - `quoteInputSchema` — Zod discriminated union on `serviceType`: `PARCEL {origin, destination, packages[1..20]}`, `COURIER {origin, destination, distanceKm}`, `FREIGHT {origin, destination, packages, freightDetails: {mode: 'AIR'|'SEA'|'ROAD', cargoType: string, description: string}}`; `type QuoteInput`
  - `loadPricingContext(): Promise<{ zones: ZoneDef[]; rates: ParcelRateDef[]; courier: CourierRateDef }>` in `src/server/rates.ts`
  - `calculatePrice(input: QuoteInput): Promise<ActionResult<PriceResult>>` — public; FREIGHT → `fail('Freight is priced manually')`
  - `createQuote(input: QuoteInput): Promise<ActionResult<{ id: string }>>` — requires user; PARCEL/COURIER re-priced server-side → `PRICED`, `expiresAt = now + 7d`; pricing failure → `fail(<human message>)`; FREIGHT → `PENDING_REVIEW`, no price
  - `getMyQuote(id: string)` → quote if owned by current user else `null`

- [ ] **Step 1: Failing tests**
  - Schema: package with `weightKg: 0` or negative dimension or `qty: 0` rejected; `countryCode` must be 2 letters; `distanceKm` must be > 0
  - `createQuote` PARCEL (seeded rates) → status `PRICED`, `priceCents > 0`, `expiresAt` ≈ now+7d; FREIGHT → `PENDING_REVIEW`, `priceCents === null`
  - Client-supplied `priceCents` field is ignored (stripped by schema)
  - Not logged in → `{ok:false, error:'Please log in'}`
  - Review Focus #4: customer B `getMyQuote(<A's id>)` → `null`
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement actions. Then UI: `QuoteStepper` with steps Service → Addresses → Packages/Details → Result, Framer Motion `AnimatePresence` slide between steps, service choice as animated cards (Task 11 swaps in the tilt card; use shadcn Card for now). Result step calls `calculatePrice` for instant prices; "Book this" calls `createQuote` — if not logged in, persist form to `sessionStorage` (wrapped in try/catch), redirect `/login?next=/quote`, restore on return. Freight result step submits directly.
- [ ] **Step 4:** Tests PASS; manual: get a parcel price logged out, log in, save quote.
- [ ] **Step 5:** Commit `feat: quote schema, pricing actions, quote stepper`.

### Task 7: Booking, Stripe, email

**Files:**
- Create: `src/server/stripe.ts`, `src/server/email.ts`, `src/server/email-templates.ts`, `src/server/actions/booking.ts`, `src/server/shipments.ts`, `src/app/api/stripe/webhook/route.ts`, `tests/integration/booking.test.ts`

**Interfaces:**
- Consumes: `generateTrackingNumber`, `requireUser`, `db`
- Produces:
  - `createCheckoutSession(args: { shipmentId: string; trackingNumber: string; priceCents: number; customerEmail: string }): Promise<{ id: string; url: string }>` — success URL `/shipments/<id>?paid=1`, cancel URL `/quotes/<quoteId>`, `metadata.shipmentId`
  - `sendEmail(msg: { to: string; subject: string; html: string }): Promise<void>` — Resend if `RESEND_API_KEY`, else `console.info`; never throws
  - Templates: `quoteReadyEmail(q)`, `bookingConfirmedEmail(s)`, `statusChangedEmail(s, event)` → `{ subject, html }`
  - `acceptQuote(quoteId: string): Promise<ActionResult<{ shipmentId: string; checkoutUrl: string | null }>>`
  - `completeCheckout(sessionId: string, shipmentId: string): Promise<'updated' | 'noop'>` in `src/server/shipments.ts`
  - `createShipmentWithUniqueNumber(tx, data)` — retries tracking number on unique violation (max 5)

- [ ] **Step 1: Failing tests** (`vi.mock('@/server/stripe')`, `vi.mock('@/server/email')`)
  - PARCEL accept → shipment `AWAITING_PAYMENT`, `CARD`, `UNPAID`, `priceCents` copied from quote, `checkoutUrl` returned, quote `ACCEPTED`
  - FREIGHT (PRICED) accept → shipment `BOOKED`, `INVOICE`, `UNPAID`, `checkoutUrl === null`, one TrackingEvent `BOOKED`, booking email sent
  - Review Focus #2: accept twice (sequential and `Promise.all`) → exactly 1 shipment, second call `{ok:false, error:'Quote already accepted'}`; expired quote → `{ok:false, error:'Quote has expired'}`; `PENDING_REVIEW` quote → `ok:false`
  - Review Focus #4: customer B accepting A's quote → `{ok:false, error:'Not found'}`
  - `completeCheckout` → `PAID`, `BOOKED`, one `BOOKED` TrackingEvent, one email; Review Focus #3: second call → `'noop'`, still one event and one email
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. `acceptQuote` runs in a `db.$transaction` using `updateMany({ where: { id, userId, status: 'PRICED', expiresAt: { gt: now } }, data: { status: 'ACCEPTED' } })` and checks `count === 1` before creating the shipment (this is what makes concurrent accepts safe); diagnose the failure reason with a follow-up read. `completeCheckout` uses the same conditional-update pattern on `paymentStatus: 'UNPAID'`. Webhook route verifies signature with `STRIPE_WEBHOOK_SECRET`, handles only `checkout.session.completed`, returns 200 for others.
- [ ] **Step 4:** Tests PASS; manual with `stripe listen --forward-to localhost:3000/api/stripe/webhook` and test card 4242….
- [ ] **Step 5:** Commit `feat: booking, stripe checkout, webhook, email`.

### Task 8: Customer dashboard

**Files:**
- Create: `src/app/(customer)/dashboard/page.tsx`, `src/app/(customer)/quotes/[id]/page.tsx`, `src/app/(customer)/shipments/[id]/page.tsx`, `src/components/shipment/StatusTimeline.tsx`, `src/components/shipment/StatusBadge.tsx`, `src/server/queries/customer.ts`, `tests/integration/customer-queries.test.ts`

**Interfaces:**
- Consumes: `getMyQuote`, `acceptQuote`, `requireUser`, `formatMoney`
- Produces: `listMyQuotes()`, `listMyShipments()`, `getMyShipment(id)` (with events, newest last; `null` if not owned); `<StatusTimeline events={...} />` (reused by tracking page, Task 10); `<StatusBadge status={...} />`

- [ ] **Step 1: Failing tests:** list functions return only the current user's rows, newest first; `getMyShipment(<other user's id>) === null`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement queries + pages. Quote page: price, expiry countdown, "Accept & pay" (card) / "Accept" (freight) button → redirect to `checkoutUrl` or shipment page. Expired/declined quotes show state, no button. Shipment page: tracking number (copy button), payment status, `StatusTimeline` with staggered Framer Motion entrance, "Pay now" if `AWAITING_PAYMENT`.
- [ ] **Step 4:** Tests PASS; manual walkthrough of both quote types.
- [ ] **Step 5:** Commit `feat: customer dashboard, quote and shipment pages`.

### Task 9: Admin area

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/quotes/page.tsx`, `src/app/admin/shipments/page.tsx`, `src/app/admin/shipments/[id]/page.tsx`, `src/app/admin/pricing/page.tsx`, `src/app/admin/customers/page.tsx`, `src/server/actions/admin-quotes.ts`, `src/server/actions/admin-shipments.ts`, `src/server/actions/admin-pricing.ts`, `src/server/queries/admin.ts`, `tests/integration/admin.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `canTransition`, `ADMIN_SETTABLE_STATUSES`, `sendEmail` + templates, `db`
- Produces:
  - `priceFreightQuote(input: { quoteId: string; priceCents: number; note?: string })` → `PRICED`, `expiresAt = now + 7d`, `quoteReadyEmail`
  - `declineFreightQuote(input: { quoteId: string; note: string })` → `DECLINED`
  - `updateShipmentStatus(input: { shipmentId: string; status: ShipmentStatus; location: string; countryCode?: string; note?: string })` → validates `canTransition`, writes TrackingEvent, `statusChangedEmail`
  - `setPaymentStatus(input: { shipmentId: string; paymentStatus: 'PAID' | 'UNPAID' })`
  - `upsertZone`, `deleteZone` (fails if rates reference it: `'Zone has rates; delete them first'`), `upsertParcelRate`, `deleteParcelRate`, `updateCourierRate`
  - `getAdminCounts(): Promise<{ pendingQuotes: number; awaitingPayment: number; inTransit: number; exceptions: number }>`

- [ ] **Step 1: Failing tests**
  - Every action called as CUSTOMER → `{ok:false, error:'Not authorized'}` (loop over all exported actions)
  - `priceFreightQuote` on a PARCEL quote or non-`PENDING_REVIEW` quote → `ok:false`; on valid → PRICED + email
  - `updateShipmentStatus` DELIVERED → IN_TRANSIT → `{ok:false, error:'Cannot move from DELIVERED to IN_TRANSIT'}`; valid move writes one event + one email
  - `setPaymentStatus` toggles
  - Pricing: `priceCents` negative rejected; `deleteZone` with rates → error message above; `updateCourierRate` then a new courier quote uses the new price
  - `getAdminCounts` returns correct numbers for a seeded mix
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement actions and pages. Admin UI: sidebar layout, shadcn tables, dialogs for status update / pricing; money inputs in dollars converted to cents on submit. Pricing page shows the rate matrix as one table per origin zone (rows = weight bands, columns = destination zones), cells editable inline. Shipments list filters by status and searches by tracking number/email.
- [ ] **Step 4:** Tests PASS; manual: price a freight quote, move a shipment through every status.
- [ ] **Step 5:** Commit `feat: admin quotes, shipments, pricing, customers`.

### Task 10: Public tracking

**Files:**
- Create: `src/server/tracking.ts`, `src/server/rate-limit.ts`, `src/lib/geo/centroids.ts`, `src/app/(public)/track/page.tsx`, `src/app/(public)/track/[number]/page.tsx`, `src/app/(public)/track/[number]/not-found.tsx`, `tests/integration/tracking.test.ts`, `src/server/rate-limit.test.ts`

**Interfaces:**
- Consumes: `normalizeTrackingNumber`, `isTrackingNumber`, `StatusTimeline`, `db`
- Produces:
  - `type PublicTracking = { trackingNumber: string; serviceType: ServiceType; status: ShipmentStatus; origin: { city: string; countryCode: string }; destination: { city: string; countryCode: string }; events: { status: ShipmentStatus; location: string; countryCode: string | null; note: string | null; createdAt: Date }[] }`
  - `getPublicTracking(raw: string): Promise<PublicTracking | null>`
  - `rateLimit(key: string, limit: number, windowMs: number): boolean` (in-memory sliding window; true = allowed)
  - `countryCentroid(code: string): { lat: number; lng: number } | null` — static table covering all ISO-3166 alpha-2 codes

- [ ] **Step 1: Failing tests**
  - Review Focus #5: lookup with lowercase and surrounding spaces finds the shipment; malformed input → `null` without a DB query; unknown valid-format number → `null`
  - Returned object's JSON contains no `priceCents`, `name`, `phone`, `line1`, `email` keys (assert via `JSON.stringify` + regex)
  - `AWAITING_PAYMENT` shipments → `null` (not yet trackable)
  - `rateLimit('ip', 3, 60000)` → true,true,true,false; new window → true
  - `countryCentroid('us')` non-null; `countryCentroid('ZZ') === null`
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Page: rate-limit by `x-forwarded-for` (60/min); over the limit renders a "Too many requests" message. `/track` is a search box that navigates to `/track/<normalized>`. Detail page shows status hero, route (city, country → city, country), `StatusTimeline`, and a placeholder slot for the globe (filled in Task 12).
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `feat: public tracking with rate limit`.

### Task 11: Visual system and landing page

**Files:**
- Create: `src/components/motion/MotionProvider.tsx`, `src/components/motion/FadeIn.tsx`, `src/components/motion/Stagger.tsx`, `src/components/cards/TiltCard.tsx`, `src/components/cards/GlowCard.tsx`, `src/components/site/Header.tsx`, `src/components/site/Footer.tsx`, `src/app/(public)/page.tsx`, `src/app/globals.css` (theme tokens), `src/components/cards/TiltCard.test.tsx`
- Modify: `src/app/layout.tsx` (wrap in `MotionProvider`, header/footer), `src/components/quote/QuoteStepper.tsx` (service cards → `TiltCard`)

**Interfaces:**
- Produces: `<MotionProvider>` (`MotionConfig reducedMotion="user"`); `<FadeIn delay?>`; `<Stagger>`; `<TiltCard maxTilt?={10}>` (pointer-driven rotateX/Y with spring, glare overlay, no tilt when reduced motion); `<GlowCard>` (cursor-follow radial glow border); `<HeroGlobeSlot />` placeholder consumed in Task 12

- [ ] **Step 1: Failing test** (Vitest + Testing Library, `jsdom` env for this file): `TiltCard` renders children; with `matchMedia('(prefers-reduced-motion: reduce)')` mocked true, pointer move leaves `transform` unset.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Theme: dark navy base, electric-blue/teal accent, light-mode tokens too (CSS variables on `:root` + `.dark`, matching shadcn conventions). Landing sections: hero (headline, quote CTA, tracking input, globe slot), three service `TiltCard`s (Parcel / Local Courier / Freight), "How it works" 3-step staggered row, coverage strip, CTA footer.
- [ ] **Step 4:** Test PASS; `npm run build` succeeds; manual check at 375px width — no horizontal scroll.
- [ ] **Step 5:** Commit `feat: motion system, animated cards, landing page`.

### Task 12: 3D globe

**Files:**
- Create: `src/components/3d/capability.ts`, `src/components/3d/capability.test.ts`, `src/components/3d/Globe.tsx`, `src/components/3d/RouteArc.tsx`, `src/components/3d/Marker.tsx`, `src/components/3d/GlobeSection.tsx`, `src/components/3d/GlobeErrorBoundary.tsx`, `public/globe-fallback.webp`, `src/lib/geo/sphere.ts`, `src/lib/geo/sphere.test.ts`
- Modify: landing page (replace `HeroGlobeSlot`), `src/app/(public)/track/[number]/page.tsx` (globe slot)

**Interfaces:**
- Consumes: `countryCentroid`
- Produces:
  - `shouldUse3D(env: { webgl: boolean; reducedMotion: boolean; width: number }): boolean` — true only if webgl && !reducedMotion && width ≥ 768
  - `latLngToVector3(lat: number, lng: number, radius: number): [number, number, number]`; `arcPoints(from: LatLng, to: LatLng, radius: number, segments: number): [number, number, number][]` (great-circle slerp with altitude lift proportional to angular distance)
  - `<GlobeSection routes={{from: LatLng; to: LatLng}[]} marker?={LatLng} autoRotate?={boolean} />` — client component; decides 3D vs fallback image; wraps `next/dynamic(() => import('./Globe'), { ssr: false })` in `GlobeErrorBoundary`

- [ ] **Step 1: Failing tests:** `shouldUse3D` truth table (4 cases); `latLngToVector3(0,0,1)` ≈ `[1,0,0]` per chosen convention and `(90,0,1)` ≈ `[0,1,0]`; `arcPoints` returns `segments+1` points, first ≈ from, last ≈ to, midpoint radius > `radius`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Globe: dark sphere with dotted land texture (points sampled from a bundled low-res land mask), atmosphere glow (fresnel shader on a slightly larger back-face sphere), `RouteArc` as drei `<Line>` with animated dash offset, `Marker` pulsing ring. `<Canvas dpr={[1, 2]} frameloop="demand">` with an IntersectionObserver that stops invalidation off-screen; `OrbitControls` with zoom/pan disabled. Landing: 6 sample routes between hub cities, autoRotate. Tracking: one route from origin country centroid to destination country centroid, marker at the latest event's `countryCode` (fallback to origin).
- [ ] **Step 4:** Tests PASS; manual: landing and tracking render globe on desktop; with DevTools "prefers-reduced-motion: reduce" → static image; simulate WebGL failure (throw in Globe) → fallback, rest of page intact; Lighthouse mobile performance on `/` ≥ 85 against `npm run build && npm start`.
- [ ] **Step 5:** Commit `feat: 3d globe on landing and tracking`.

### Task 13: End-to-end tests and deploy readiness

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/parcel-flow.spec.ts`, `tests/e2e/freight-flow.spec.ts`, `tests/e2e/fallback.spec.ts`, `src/app/api/test/complete-checkout/route.ts` (only when `E2E_TEST_MODE=1`), `README.md`

**Interfaces:**
- Consumes: everything above; `completeCheckout` (test route calls it directly so E2E doesn't need Stripe)

- [ ] **Step 1: Write specs**
  - Parcel: logged-out instant price → "Book" → register → quote restored → accept → (test route completes checkout) → shipment page shows `PAID`/`BOOKED` → `/track/<number>` shows timeline
  - Freight: customer submits → admin (seeded) prices at $1,250.00 → customer sees price, accepts → admin moves to `PICKED_UP` → public tracking shows `PICKED_UP`
  - Fallback: launch with `--disable-webgl` → landing renders fallback image and the quote CTA works
  - Test route returns 404 when `E2E_TEST_MODE` unset (assert in a Vitest integration test)
- [ ] **Step 2:** `npx playwright test` → fix until PASS.
- [ ] **Step 3:** README: setup, env vars, seed, Stripe CLI, running tests, Vercel deploy (set env vars, `prisma migrate deploy` in build command, Stripe webhook endpoint).
- [ ] **Step 4:** Full suite: `npm run test:unit && npm run test:int && npx playwright test && npm run build` → all green.
- [ ] **Step 5:** Commit `test: e2e flows, readme, deploy readiness`.
