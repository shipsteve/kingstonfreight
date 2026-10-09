# Shipping Site MVP — Design Spec

Date: 2026-10-09
Status: Draft, awaiting review

## 1. Goal

A web app where customers **quote, book, pay for, and track** shipments across three service types, and company staff **run all operations from an admin area** without touching code or the database.

**Success criteria**
- A customer can get a quote, book, pay (card) or be invoiced (freight), and track a shipment for each of: parcel, local courier, freight.
- Anyone with a tracking number can see status without logging in.
- Admins can edit pricing, price freight requests, post tracking updates, and mark payments — all through the UI.
- The public site feels premium: 3D globe, motion, animated cards — without slowing core flows.

## 2. Scope

**In scope**
- Service types: Parcel (instant price), Local courier (instant price), Freight/cargo (manual price by admin)
- Domestic + international coverage via admin-defined zones
- Customer accounts (email + password) with quote and shipment history
- Public tracking page
- Stripe Checkout for parcel/local; offline invoice for freight; admin can mark any shipment paid/unpaid
- Transactional emails: quote ready, booking confirmed, status changed
- Admin area: dashboard, freight quote queue, shipments, pricing, customers
- 3D globe (landing + tracking), Framer Motion transitions, animated cards

**Out of scope (later)**
- Live carrier rate APIs, label printing, customs documents, driver app/GPS
- Automatic distance calculation (maps API) — customer enters km for local courier
- Multiple currencies, invoice PDFs, refunds via UI, fine-grained admin roles

## 3. Configuration

| Setting | Default | Notes |
|---|---|---|
| `HOME_COUNTRY` | `US` | ISO-3166 alpha-2; defines "domestic" |
| `CURRENCY` | `USD` | Single currency; amounts stored as integer cents |
| Units | kg / cm / km | Metric throughout |
| Volumetric divisor | 5000 | `L×W×H (cm) / 5000` = volumetric kg |
| Quote validity | 7 days | After which a priced quote expires |

## 4. Tech Stack

- **Next.js (App Router, TypeScript)** — customer site, admin, and API in one app; Server Actions for mutations
- **PostgreSQL + Prisma** — hosted on Neon
- **Auth.js** — Credentials provider (email + bcrypt password), JWT sessions, `role` on the session
- **Stripe Checkout** (hosted page) + webhook — simpler and PCI-light vs embedding card fields
- **Resend** — transactional email
- **UI:** Tailwind CSS + **shadcn/ui** (forms, tables, dialogs) + Aceternity-style animated cards (3D tilt, glow), copied in as local components
- **Motion:** Framer Motion (`motion` package)
- **3D:** three.js via `@react-three/fiber` + `@react-three/drei`
- **Validation:** Zod on every input boundary
- **Tests:** Vitest (unit/integration), Playwright (end-to-end)
- **Deploy:** Vercel

## 5. Data Model

```
User          id, email (unique), name, passwordHash, role (CUSTOMER|ADMIN),
              company?, phone?, createdAt

Zone          id, name, kind (DOMESTIC|INTERNATIONAL),
              postcodePrefixes[]   -- DOMESTIC: matched against home-country postcodes
              countryCodes[]       -- INTERNATIONAL: matched against destination country

ParcelRate    id, originZoneId, destZoneId, maxWeightKg, priceCents
              -- weight bands; unique (originZoneId, destZoneId, maxWeightKg)

CourierRate   id (singleton), baseFeeCents, perKmCents, maxKm

Quote         id, userId?, serviceType (PARCEL|COURIER|FREIGHT),
              origin (Address JSON), destination (Address JSON),
              packages (JSON: [{weightKg, lengthCm, widthCm, heightCm, qty}]),
              distanceKm?, freightDetails? (JSON: cargo type, description, mode AIR|SEA|ROAD),
              priceCents?, status (PENDING_REVIEW|PRICED|ACCEPTED|EXPIRED|DECLINED),
              adminNote?, expiresAt?, createdAt

Shipment      id, quoteId (unique), userId, trackingNumber (unique),
              serviceType, status (see §7), priceCents,
              paymentMethod (CARD|INVOICE), paymentStatus (UNPAID|PAID),
              stripeSessionId?, origin, destination (Address JSON), createdAt

TrackingEvent id, shipmentId, status, location (text), countryCode?, note?, createdAt

Address (JSON) = { name, line1, line2?, city, postcode, countryCode, phone? }
```

Tracking numbers: `SHP-` + 10 uppercase alphanumerics (no ambiguous chars 0/O/1/I), generated server-side, retried on collision.

Globe coordinates come from a static country-centroid table (`countryCode → lat/lng`); no geocoding in the MVP.

## 6. Pricing Engine (pure module, `src/lib/pricing`)

All pricing is pure functions over rates passed in — no DB access — so it is fully unit-tested.

**Parcel**
1. Per package: `billableKg = max(weightKg, L×W×H/5000)`, rounded up to 0.5 kg; multiply by `qty`; sum.
2. Resolve origin and destination zones: home-country address → DOMESTIC zone by longest matching postcode prefix; other country → INTERNATIONAL zone containing its country code.
3. Find the `ParcelRate` for (originZone, destZone) with the smallest `maxWeightKg ≥ billableKg`.
4. No zone or no band large enough → return `{ ok: false, reason }` and the UI offers a freight quote instead.

**Courier**
- Both addresses must be in the home country, and `distanceKm ≤ maxKm`.
- `price = baseFeeCents + ceil(distanceKm) × perKmCents`.

**Freight**
- Never auto-priced. Quote is created `PENDING_REVIEW`; an admin sets `priceCents` + note → `PRICED`.

## 7. Flows

**Quote (public, `/quote`)** — multi-step animated stepper: service → addresses → packages/details → result.
- Parcel/courier: price shown instantly. Anyone can calculate; **login required to save/book** (login redirects back with form state preserved).
- Freight: login required to submit; shows "We'll email your quote" confirmation.

**Booking**
- Customer accepts a `PRICED`, unexpired quote → Shipment created with tracking number.
- Card (parcel/courier): shipment `AWAITING_PAYMENT` → redirect to Stripe Checkout → webhook `checkout.session.completed` sets `PAID` + status `BOOKED` + first TrackingEvent + confirmation email.
- Invoice (freight): shipment created directly as `BOOKED`, `UNPAID`; confirmation email says an invoice will follow.

**Shipment status lifecycle**
`AWAITING_PAYMENT → BOOKED → PICKED_UP → IN_TRANSIT → [CUSTOMS] → OUT_FOR_DELIVERY → DELIVERED`
plus `EXCEPTION` (any time, recoverable) and `CANCELLED` (terminal). Admin may move to any non-terminal status; each change writes a TrackingEvent and emails the customer.

**Tracking (`/track`, `/track/[number]`)** — public. Shows status timeline (animated), origin/destination, and a 3D globe with the route arc and a marker at the latest event's country. Does not show price, customer contact details, or full addresses (city + country only).

## 8. Pages

**Public:** `/` (globe hero, service cards, quote CTA, tracking box), `/quote`, `/track`, `/track/[number]`, `/login`, `/register`

**Customer (auth):** `/dashboard` (quotes + shipments), `/quotes/[id]` (view, accept → book), `/shipments/[id]` (detail + timeline + payment status)

**Admin (role ADMIN):**
- `/admin` — counts: pending freight quotes, awaiting payment, in transit, exceptions
- `/admin/quotes` — freight review queue; set price + note, or decline
- `/admin/shipments` — filter/search, update status with location/note, mark paid/unpaid
- `/admin/pricing` — zones, parcel rate matrix, courier rate
- `/admin/customers` — read-only list with their shipments

Admin UI uses shadcn tables/forms with light motion only. First admin is created by a seed script (`ADMIN_EMAIL`, `ADMIN_PASSWORD` env vars).

## 9. Code Structure

```
src/
  app/                 routes per §8; (public) (customer) admin/ route groups
  app/api/stripe/webhook/route.ts
  lib/pricing/         parcel.ts, courier.ts, zones.ts, weight.ts (pure + tests)
  lib/tracking/        number.ts (generator), status.ts (allowed transitions)
  lib/geo/             country centroids
  server/              auth.ts, db.ts, email.ts, stripe.ts, actions/ (quotes, shipments, pricing)
  components/ui/       shadcn components
  components/cards/    animated/tilt cards
  components/3d/       Globe, RouteArc, Marker (lazy, client-only)
  components/motion/   transition + stagger helpers
prisma/schema.prisma, prisma/seed.ts
tests/e2e/             Playwright
```

## 10. 3D & Motion Guardrails

- Globe is `next/dynamic` with `ssr: false`, loaded after first paint; static image fallback while loading.
- Fallback image (no WebGL) when WebGL is unavailable, on small screens, or when `prefers-reduced-motion` is set.
- Error boundary around every canvas — a 3D failure never breaks the page.
- Device pixel ratio capped at 2; render loop pauses when off-screen.
- Motion respects `prefers-reduced-motion` (Framer Motion `MotionConfig reducedMotion="user"`).
- Target: Lighthouse performance ≥ 85 on landing (mobile).

## 11. Errors, Security, Integrity

- Zod validation on every Server Action and route handler; actions return `{ ok: true, data } | { ok: false, error }`.
- Authorization checked server-side in every action: customers may only access their own quotes/shipments; `/admin` and admin actions require `role === ADMIN` (middleware + action check).
- Stripe webhook verifies signature; handling is idempotent (no-op if shipment already `PAID`). Price is always taken from the DB quote, never the client.
- Accepting a quote re-checks status `PRICED` and `expiresAt > now` inside a transaction.
- Status changes validated against `lib/tracking/status.ts`.
- Email send failures are logged and do not fail the user's action.
- Public tracking is rate-limited and exposes no PII beyond city/country.

## 12. Testing

- **Unit (Vitest, TDD):** pricing engine (volumetric weight, zone resolution, band selection, out-of-range), courier pricing, tracking-number generator, status transitions.
- **Integration (Vitest + test Postgres):** server actions — quote creation, accept/book, admin pricing of freight, status update, authorization denials, webhook idempotency.
- **E2E (Playwright):** parcel quote → register → book → (Stripe test mode / mocked webhook) → track; freight request → admin prices → customer accepts → admin updates status → public tracking shows it.
- 3D components: smoke test that the page renders with WebGL unavailable (fallback path).
