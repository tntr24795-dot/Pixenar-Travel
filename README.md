# Havena — Vacation Rental Marketplace (3D Cinematic MVP)

A full-stack Airbnb-style marketplace: Next.js 14 (App Router, TypeScript, Tailwind,
shadcn/ui), Supabase (Postgres + Auth + Storage + Realtime + RLS), Stripe Connect
(marketplace payments), Mapbox (search/geocoding), and a Three.js + GSAP "3D Cinematic"
homepage — built to the product/technical guideline you provided.

## What's already real vs. what you need to plug in

**Already live** — a dedicated Supabase project was created and fully migrated for you:

- Project: **Havena** (`rizdfexhrpqijufviyyx`), org `PixenarAI36`'s Supabase account,
  region `us-west-1`. Dashboard: https://supabase.com/dashboard/project/rizdfexhrpqijufviyyx
- Every table, enum-style check constraint, index, the double-booking-prevention
  exclusion constraint, and every Row Level Security policy from the guideline are
  applied (`supabase/migrations/0001_schema.sql`, `0002_rls.sql`). 12 starter amenities
  are seeded.
- A public `listing-images` Storage bucket exists with RLS policies scoping uploads to
  `{user_id}/...` folders.
- This project is **intentionally separate** from your other Supabase project
  (`PixenarAI36 Project`), which already runs a live, unrelated AI-video app with its own
  `profiles`/billing/credits tables and user pool — Havena needed its own `auth.users`
  so signups here never collide with that product.

**You need to provide** (copy `.env.local.example` → `.env.local` and fill in):

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — copy from the Havena project's Settings → API page.
- `SUPABASE_SERVICE_ROLE_KEY` — same page. **Never** expose this to the browser or commit it.
- Stripe: create a free account, enable **Connect** (Settings → Connect → get started,
  Express accounts), grab your **test-mode** secret/publishable keys, and create a
  webhook endpoint (`stripe listen --forward-to localhost:3000/api/stripe/webhook` for
  local dev, or a real endpoint once deployed) to get `STRIPE_WEBHOOK_SECRET`.
- Mapbox: create a free account, grab a public token (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`)
  and a secret token with geocoding scope (`MAPBOX_SECRET_TOKEN`).
- Resend (or swap for Postmark/SendGrid): `RESEND_API_KEY` — email sending isn't wired
  into the booking/auth flows yet (see Known gaps below); the dependency is installed
  and ready.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values above
npm run dev                        # http://localhost:3000
```

Useful scripts: `npm run typecheck`, `npm test` (pricing-engine unit tests), `npm run build`.

To receive Stripe webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
and paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Verified before delivery

- `npx tsc --noEmit` — **zero errors** across all ~200 TypeScript files.
- `npm run build` (`next build`) — **all 52 routes compile and generate successfully**
  (the only build hiccup seen in this sandbox was Google Fonts being unreachable over
  this environment's restricted network — that's an artifact of this sandbox, not your
  machine or Vercel, both of which have normal internet access).
- `npm test` — **13/13 pricing-engine unit tests pass**, including the exact worked
  example from your spec ($100×3 nights + $50 cleaning + 10% guest service fee = $380)
  and the $500 subtotal / 10% commission / $450 payout example.
- Database schema + RLS applied directly to the live Supabase project via migration
  (not just written to disk) and confirmed with `list_tables`/`generate_typescript_types`.

## Project structure

```
app/
  (public)/        home, search, listing detail, about/terms/privacy/help/contact/etc.
  (auth)/          login, signup, forgot-password
  checkout/        booking hold → Stripe Elements → confirmation
  account/         traveler dashboard (profile, trips, wishlist, messages, settings)
  host/            host onboarding, dashboard, 10-step listing wizard, calendar,
                   reservations, messages, earnings, payouts
  admin/           dashboard, users, hosts, listings review, bookings, payments,
                   payouts, disputes, reviews, reports, settings
  api/             route handlers — listings/search, quote, bookings, stripe, admin
components/        ui (shadcn primitives), layout, three (3D hero), search, listings,
                   booking, host, wishlist
lib/
  pricing/         calculateBookingQuote() — the single source of truth for every price
  availability/    checkAvailability() — UX pre-check (DB exclusion constraint is the
                   real double-booking guard)
  supabase/        browser / server (RLS-respecting) / admin (service-role) clients
  stripe/          Connect onboarding, PaymentIntent creation, webhook verification
  mapbox/          geocoding
  validation/      Zod schemas for every form and API input
services/          booking.service.ts — hold/confirm/cancel domain logic
supabase/migrations/  schema + RLS SQL, already applied
```

## Known gaps / next steps (all called out in code comments where they occur)

- **Legal review required**: the cancellation-policy refund math (`services/booking.service.ts`
  `cancelBooking`) and the tax-rate default (0% in `calculateBookingQuote`'s options) are
  simplified placeholders your spec explicitly says need legal/tax review before real money moves.
- **Message read receipts**: `messages` has SELECT/INSERT RLS policies but no UPDATE
  policy yet, so "mark as read" calls are wired up but currently no-op. Add an
  `messages_update_participant_mark_read` policy when you're ready.
- **Notifications table**: not in the schema (out of the guideline's listed tables) —
  `/account/notifications` is a placeholder. Add a table + wire it up post-MVP.
  `platform_settings` (making commission/service-fee/tax rates admin-editable instead of
  hardcoded `calculateBookingQuote()` defaults) is the same situation — documented, not built.
- **"Distance" sort** in search falls back to "recommended" — real geo-distance sorting
  needs PostGIS or a lat/lng haversine calc, noted with a TODO in `lib/listings/searchListings.ts`.
- **No accept/reject on non-instant bookings**: the schema has no "requested" status
  distinct from `pending_payment`/`confirmed`, so every booking is effectively instant-book
  once payment succeeds. A true request-to-book flow needs a schema addition.
- **Email sending** (verify/welcome/booking confirmation/etc. from section 2) isn't wired
  in yet — `resend` is installed and `RESEND_API_KEY`/`EMAIL_FROM` are in the env template,
  but no call sites exist yet. Straightforward to add in the webhook/booking-service layer.
- **Payment methods page** is informational only (Havena never stores card numbers —
  Stripe Elements handles that at checkout); no saved-card management UI yet.
- Dependency note: `@supabase/ssr` was bumped from the originally-planned `^0.5.1` to
  `^0.12.4` to match the installed `@supabase/supabase-js@2.112.0` — an older `ssr` version
  paired with a newer `supabase-js` caused every typed query to collapse to `never`. Fixed
  at the source rather than papering over it with casts everywhere.

## Non-negotiables this build honors (from your own spec)

Every dollar amount is integer cents end-to-end. Every price a user is ever charged is
computed by one function, server-side, from fresh database rows — never trusted from the
browser. Full street addresses never render on any public page — only city/state until a
booking is confirmed. The Postgres exclusion constraint (not just an app-level check) is
what actually prevents two guests from double-booking the same dates. Stripe webhooks
verify their signature and are idempotent via a `payment_events` ledger keyed by Stripe's
own event id. New listings require admin approval before going public. Admin mutations
write an audit log entry.
