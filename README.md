# KingstonFreight — shipping site

Customers request quotes for **parcels**, **local courier** and **freight**, and our team prices every request. Customers prepay a **USD balance with Bitcoin or Litecoin**. Each payment is verified by an admin, and the first verified payment approves the account. Only approved accounts with enough balance can book. Shipments are tracked publicly by number. Staff run everything from `/admin`: verify payments, price quotes, create counter orders, print QR receipts and post tracking updates.

Built with Next.js 16 (App Router), Prisma + PostgreSQL, Auth.js, Resend, Tailwind + shadcn/ui, Framer Motion, three.js (react-three-fiber) and `qrcode`.

- MVP spec: [`docs/superpowers/specs/2026-10-09-shipping-site-mvp-design.md`](docs/superpowers/specs/2026-10-09-shipping-site-mvp-design.md)
- Wallet / admin orders spec: [`docs/superpowers/specs/2026-10-10-wallet-admin-orders-design.md`](docs/superpowers/specs/2026-10-10-wallet-admin-orders-design.md)

## Run it locally

Requires Node 20+. No Docker or installed Postgres needed: dev and tests use `embedded-postgres`.

```bash
npm install
# create .env with the variables in the table below (at least DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD)
npm run db                    # terminal 1: local Postgres on :5433 (data in .pgdata/dev)
npx prisma migrate deploy     # terminal 2: create tables
npx prisma db seed            #             zones, rates, courier rate, admin user
npm run dev                   #             http://localhost:3000
```

Log in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to reach `/admin`. To use a hosted database (e.g. Neon) instead, set `DATABASE_URL` to it and skip `npm run db`.

## How money works

1. **Top-up.** On `/account/wallet` the customer sends BTC or LTC to your address (`BTC_ADDRESS` / `LTC_ADDRESS`), then submits the USD amount (minimum `MIN_TOPUP_USD`, default $50) and the transaction ID.
2. **Verification.** The site looks the transaction up on mempool.space or litecoinspace.org and stores the result: amount sent to your address, confirmations, and a USD estimate from CoinGecko. It appears in **Admin → Funding**.
3. **Approval.** The admin checks the verdict (or opens the explorer link) and clicks **Approve**. The credit defaults to the smaller of the requested amount and the on-chain estimate, and can be edited. The customer's first approved top-up also **approves their account**. **Reject** requires a reason, which is emailed to the customer.
4. **Booking.** Customers submit quote requests, and staff price them in **Admin → Quotes to price** (a rate-table suggestion is shown for parcel and courier). Accepting a priced quote deducts it from the balance atomically, so two bookings can never overspend.
5. **Cancellation.** When an admin cancels a balance-paid shipment, the price is refunded to the balance automatically.

Every credit and debit is a row in an append-only ledger. The balance is always the sum of the rows, so there is a full audit trail. Admins can **approve**, **suspend** or **adjust** (with a note) any customer in **Admin → Customers**.

**Counter orders:** **Admin → Shipments → New order** records pieces, weights, contents, declared value, airport codes and departure/arrival dates. The order is either *Paid at counter* or charged to an approved customer's balance. **Print receipt** gives a branded receipt whose QR code opens the public tracking page. Counter orders email the customer a tracking link plus a **one-time claim link**; opening it while signed in adds the order to that account. Accounts aren't email-verified, so orders are never linked just because an email matches. Orders charged to a balance are linked to that account directly.

## Environment variables

All settings live in a single `.env` file (git-ignored, never committed). On Vercel, enter the same keys under Project → Settings → Environment Variables. If a database password contains special characters, URL-encode it (for example `"` → `%22`).

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | `npx auth secret` |
| `AUTH_TRUST_HOST` | prod (non-Vercel) | `true` when behind a proxy; Vercel sets this automatically |
| `APP_URL` | yes | Public base URL; used in emails and receipt QR codes |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | First admin account (password ≥ 8 characters; seeding refuses without them) |
| `BTC_ADDRESS`, `LTC_ADDRESS` | for top-ups | Your receiving addresses. A coin without an address is hidden |
| `MIN_TOPUP_USD` | no (default `50`) | Minimum top-up |
| `CHAIN_LOOKUP` | no (default on) | `off` disables explorer and price lookups |
| `HOME_COUNTRY` | no (default `US`) | Defines "domestic" for zones and local courier |
| `CURRENCY` | no (default `USD`) | Single currency; amounts are stored in cents |
| `COMPANY_NAME` | no (default `KingstonFreight`) | Shown in header, footer, titles, receipts |
| `COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`, `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `GOVERNING_LAW` | recommended | Shown on the legal and contact pages; unset values are left out. `GOVERNING_LAW` is the jurisdiction, e.g. `Jamaica` |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Without a key, emails are logged to the console |
| `TRUST_PROXY` | self-hosted behind a proxy | `1` to read the client IP from the proxy's `x-forwarded-for` hop. Vercel is detected automatically |
| `GEOCODE_PROVIDER` | no (default `nominatim`) | City lookups for the tracking globe (sends only city + country). `off` uses country centres |
| `DATABASE_URL_TEST` | no | Only with `USE_EXTERNAL_TEST_DB=1`; otherwise tests start their own Postgres |

`CURRENCY`, `HOME_COUNTRY` and `COMPANY_NAME` are baked into the client bundle at build time, so rebuild after changing them.

## Legal pages

`/terms`, `/privacy`, `/refunds`, `/prohibited-items` and `/contact` are plain-language templates for a US shipping business that holds prepaid, crypto-funded balances. Sign-up requires accepting the Terms and Privacy Policy, and the acceptance time is stored on the user. **Have a lawyer review and adapt these pages before launch.** In particular, check whether holding customer balances funded in crypto brings money-transmitter or similar obligations in your state.

## Tests

```bash
npm run test:unit   # pricing, weights, dates, chain parsing, QR, route rules, UI units (Vitest)
npm run test:int    # server actions and queries against a throwaway Postgres (Vitest)
npm run test:e2e    # full browser flows against a production build on :3200 (Playwright)
```

The E2E run builds the app, starts a fresh database with placeholder wallet addresses and lookups off, and covers:
- register → top-up → admin approval → staff-priced quote → pay from balance → tracking
- admin counter order → receipt with QR → tracking with dates

## Deploy to Vercel

1. Create a Postgres database (Neon works well) and set `DATABASE_URL`.
2. Set the env vars above in the Vercel project, including `APP_URL` = your domain and your real `BTC_ADDRESS` / `LTC_ADDRESS`.
3. Build command: `npx prisma migrate deploy && next build`.
4. Seed once from your machine: `DATABASE_URL=… ADMIN_EMAIL=… ADMIN_PASSWORD=… npx prisma db seed`.
5. Verify your sending domain in Resend and set `RESEND_API_KEY` and `EMAIL_FROM`.

## Swapping in your own photos

The landing page illustrations live in `public/images/` (`airport`, `parcels`, `courier`, `cargo`, `warehouse`). Replace them with your own photos, keeping the names or updating the paths in `src/lib/site.ts`, which also holds the alt text.

## Known limits

- Rate limits (tracking 60/min, sign-up 5/15 min, login 10/15 min per IP, top-ups 10/hour per user) are in-memory per server instance. Use Upstash/Redis when scaling out.
- Top-ups are verified manually; NOWPayments can be added later (`TopUpMethod.NOWPAYMENTS` and an IPN route; see the wallet spec §12).
- City lookups use the public Nominatim service (fine at booking volume). For heavy traffic, switch to a paid geocoder.
- No password reset or email verification yet. No crypto withdrawals in-app (handled by support), carrier label formats or commercial invoices.
