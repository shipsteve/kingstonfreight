# KingstonFreight — shipping site

Customers get instant quotes for **parcels** and **local courier**, request **freight** quotes that staff price by hand, book and pay (Stripe card, or invoice for freight), and track shipments publicly. Staff run everything from `/admin`.

Built with Next.js 16 (App Router), Prisma + PostgreSQL, Auth.js, Stripe Checkout, Resend, Tailwind + shadcn/ui, Framer Motion and three.js (react-three-fiber).

- Design spec: [`docs/superpowers/specs/2026-10-09-shipping-site-mvp-design.md`](docs/superpowers/specs/2026-10-09-shipping-site-mvp-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-10-09-shipping-site-mvp.md`](docs/superpowers/plans/2026-10-09-shipping-site-mvp.md)

## Run it locally

Requires Node 20+. No Docker or installed Postgres needed: dev and tests use `embedded-postgres`.

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET (npx auth secret) and the admin login
npm run db                    # terminal 1: local Postgres on :5433 (data in .pgdata/dev)
npx prisma migrate deploy     # terminal 2: create tables
npx prisma db seed            #             zones, rates, courier rate, admin user
npm run dev                   #             http://localhost:3000
```

Log in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to reach `/admin`.

To use a hosted database (e.g. Neon) instead, set `DATABASE_URL` to it and skip `npm run db`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | `npx auth secret` |
| `AUTH_TRUST_HOST` | prod (non-Vercel) | `true` when behind a proxy; Vercel sets this automatically |
| `APP_URL` | yes | Public base URL, used in emails and Stripe redirects |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | First admin account |
| `HOME_COUNTRY` | no (default `US`) | Defines "domestic" for zones and local courier |
| `CURRENCY` | no (default `USD`) | Single currency; amounts are stored in cents |
| `COMPANY_NAME` | no (default `KingstonFreight`) | Shown in header, footer, titles |
| `STRIPE_SECRET_KEY` | for card payments | Test key `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | for card payments | `whsec_…` from `stripe listen` or the dashboard endpoint |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Without a key, emails are logged to the console |
| `TRUST_PROXY` | self-hosted behind a proxy | `1` to read the client IP from the proxy's `x-forwarded-for` hop. Vercel is detected automatically. Without either, forwarding headers are ignored (they can be forged) and all visitors share one rate-limit bucket |
| `GEOCODE_PROVIDER` | no (default `nominatim`) | Looks up origin/destination cities for the tracking globe via OpenStreetMap Nominatim, sending only city + country. `off` uses country centres |
| `DATABASE_URL_TEST` | no | Only with `USE_EXTERNAL_TEST_DB=1`; otherwise tests start their own Postgres |

`CURRENCY`, `HOME_COUNTRY` and `COMPANY_NAME` are baked into the client bundle at build time, so rebuild after changing them.

## Stripe (card payments)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints STRIPE_WEBHOOK_SECRET
```

Pay with test card `4242 4242 4242 4242`, any future date and any CVC. The webhook marks the shipment paid and booked. If a customer abandons checkout, the shipment page offers **Pay now**.

## Tests

```bash
npm run test:unit   # pricing, tracking numbers, status rules, geo math, UI units (Vitest)
npm run test:int    # server actions and queries against a throwaway Postgres (Vitest)
npm run test:e2e    # full browser flows against a production build on :3200 (Playwright)
```

The E2E run builds the app, starts a fresh database, and replaces the Stripe webhook with `/api/test/complete-checkout`, which only exists when `E2E_TEST_MODE=1`.

## Deploy to Vercel

1. Create a Postgres database (Neon works well) and set `DATABASE_URL`.
2. Set the env vars above in the Vercel project, including `APP_URL` = your domain.
3. Build command: `npx prisma migrate deploy && next build`.
4. Seed once from your machine: `DATABASE_URL=… ADMIN_EMAIL=… ADMIN_PASSWORD=… npx prisma db seed`.
5. In Stripe → Developers → Webhooks, add `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`.

## Swapping in your own photos

The landing page illustrations live in `public/images/` (`airport`, `parcels`, `courier`, `cargo`, `warehouse`). Replace them with your own photos, keeping the names or updating the paths in `src/lib/site.ts`, which also holds the alt text.

## Known MVP limits

- Rate limits (tracking 60/min, instant price 60/min, sign-up 5/15 min, login 10/15 min per IP) are in-memory per server instance. Use Upstash/Redis when scaling out.
- City lookups use the public Nominatim service (fine at booking volume; its policy allows ~1 request/second). For heavy traffic, switch to a paid geocoder.
- Local courier distance is entered by the customer (no maps API yet).
- No label printing, customs documents, carrier APIs, multi-currency, refunds UI or invoice PDFs.
