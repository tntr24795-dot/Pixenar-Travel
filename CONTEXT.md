# Pixenar Travel — shared build context (read this first)

Pixenar Travel is a vacation-rental marketplace (like Airbnb) with a "3D Cinematic" public
front-end (Three.js + GSAP scroll storytelling). Next.js 14 App Router + TypeScript
+ Tailwind + Supabase (Postgres/Auth/Storage/Realtime) + Stripe Connect + Mapbox.

Project root: `/home/claude/havena`. Work only inside this directory.

## Already built — do not recreate, only import/use

- `types/database.ts` — hand-generated Supabase `Database` type (matches the live
  schema exactly). Also exports `Tables<'x'>`, `TablesInsert<'x'>`, `TablesUpdate<'x'>`.
- `lib/supabase/client.ts` — `createClient()` for Client Components (browser, anon key, RLS applies).
- `lib/supabase/server.ts` — `createClient()` for Server Components/Route Handlers (cookie-based session, RLS applies).
- `lib/supabase/admin.ts` — `createAdminClient()` — service-role, BYPASSES RLS. Only use
  for: booking creation/holds (server must write host_payout_cents etc that clients
  must never set), Stripe webhook processing, and cron-like jobs. Never import into a
  Client Component (it has `import "server-only"` and will fail the build if you try).
- `middleware.ts` — refreshes the Supabase session cookie and gates `/account`, `/host`,
  `/admin` behind auth (and `/admin` behind `role === 'admin'`).
- `lib/pricing/calculateBookingQuote.ts` — THE single pricing engine. Every price shown
  anywhere (search cards, listing page, checkout, PaymentIntent amount) MUST call this
  function with data freshly loaded from the database. Never re-implement price math
  elsewhere or trust a total sent from the browser. 13 passing unit tests document its
  exact behavior — read the `.test.ts` file next to it to see worked examples.
- `lib/availability/checkAvailability.ts` — fast read-only pre-check for UI feedback.
  The REAL double-booking guard is a Postgres exclusion constraint
  (`no_overlapping_bookings` in `supabase/migrations/0001_schema.sql`) — a booking
  insert for overlapping dates on the same listing will be rejected by the database
  itself. Server code should attempt the insert and catch/report a `23P01` (exclusion
  violation) Postgres error as "dates just got booked, please try again."
- `lib/stripe/server.ts` — `getStripe()`, `createConnectOnboardingLink()`,
  `createBookingPaymentIntent()` (destination-charge model — host's cut auto-transfers
  via `transfer_data`), `verifyWebhookSignature()`.
- `lib/mapbox/geocode.ts` — `geocodeAddress()`, `reverseGeocode()` (server-only, needs `MAPBOX_SECRET_TOKEN`).
- `lib/utils.ts` — `cn()` (clsx+tailwind-merge), `formatCents()`, `nightsBetween()`, `slugify()`, `generateBookingNumber()`.
- `lib/validation/schemas.ts` — Zod schemas for every form/API input (auth, search, quote,
  booking hold, the 10-step listing wizard, reviews, messages). Use these — don't write new ones for the same data.
- `constants/index.ts` — `PROPERTY_TYPES`, `ROOM_TYPES`, `CANCELLATION_POLICIES`,
  `AMENITY_ICON_MAP`, `LISTING_STATUSES`, `BOOKING_STATUSES`, `BOOKING_HOLD_MINUTES` (15),
  `NAV_LINKS`, `APP_NAME` ("Pixenar Travel").
- `package.json` — all dependencies you need are already declared (Radix primitives,
  react-day-picker, recharts, three, gsap, mapbox-gl, stripe, zod, react-hook-form,
  @hookform/resolvers, lucide-react, tailwindcss-animate, date-fns). Do not run `npm install`
  for a new package without checking here first — if you truly need something not listed,
  add it to `package.json` `dependencies` yourself (don't run `npm install <pkg>` — no network
  package installs during this build; just declare the version and mention it in your final summary).
- `supabase/migrations/0001_schema.sql`, `0002_rls.sql` — full DB schema + RLS policies,
  already applied to the live Supabase project. Read these to know exact column names,
  types, constraints, and which tables allow direct client writes vs. server-only writes.
- `.env.local.example` — every environment variable the app expects.

## Non-negotiable engineering rules (from the client's own spec)

1. All money is **integer cents**. Never a float.
2. **Server-computed prices only.** Any page/component that shows a price must derive it
   from `calculateBookingQuote()` fed by fresh DB data — never trust a number from props
   that originated in the browser for anything that gets charged.
3. **Never trust role or ownership from the client.** Every mutation must be authorized
   either by RLS (using the session-bound `lib/supabase/server` client) or, when RLS can't
   express the rule, by an explicit server-side check before using the admin client.
4. Full property addresses are hidden from the public until a booking is confirmed — only
   show city/state/approximate area pre-booking.
5. Stripe webhook handlers must verify the signature (`verifyWebhookSignature`) and be
   idempotent (check/insert into `payment_events` keyed by `stripe_event_id` before acting).
6. Use Server Components by default; add `"use client"` only where you need interactivity,
   browser APIs, hooks, or Three.js/Mapbox/Stripe Elements.
7. Include loading, empty, and error states for any data-fetching page (`loading.tsx`,
   conditional empty-state markup, try/catch with a friendly message).

## Design language

- **Public marketing pages only** (home `/`, `/search` hero intro, `/listing/[slug]` hero) get
  the full 3D-cinematic treatment (Three.js scene + GSAP ScrollTrigger + bloom/particles per
  the uploaded "3D Cinematic Website Development Guide"). This is being built by another
  agent in parallel — don't build a competing Three.js scene; if your page needs the hero,
  just leave a `<HeroScene />` component import from `@/components/three/hero-scene` and a
  brief comment, assume it exists.
- **Everything else — search results list, listing detail body, checkout, account, host
  dashboard, admin dashboard — is clean, fast, standard shadcn/ui-style UI.** No Three.js,
  no heavy scroll animation. Functional first: tables, cards, forms.
- Color palette (Tailwind CSS variables already wired in `tailwind.config.ts` under
  `brand.*` plus shadcn's standard `--primary`/`--secondary`/etc. HSL variables which you
  should define in `app/globals.css` if not already present): warm ink/coral/gold/teal —
  think "boutique hospitality," not generic SaaS blue.
- Use `lucide-react` for icons.
- Build `components/ui/*` primitives matching the **canonical shadcn/ui API** exactly
  (same prop names, same variant names) so every page that imports
  `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/dialog`,
  `@/components/ui/select`, `@/components/ui/tabs`, `@/components/ui/input`,
  `@/components/ui/label`, `@/components/ui/textarea`, `@/components/ui/badge`,
  `@/components/ui/avatar`, `@/components/ui/separator`, `@/components/ui/dropdown-menu`,
  `@/components/ui/sheet`, `@/components/ui/toast` + `use-toast`, `@/components/ui/skeleton`,
  `@/components/ui/calendar` (react-day-picker wrapper) works identically regardless of
  which agent wrote which page. If you need a primitive that doesn't exist yet at
  `components/ui/<name>.tsx`, create it there yourself using the standard shadcn/ui
  implementation rather than inventing a new API.

## File ownership for this build (avoid stepping on other agents' files)

Only touch the paths you were explicitly asked to own in your task prompt. If you need a
shared primitive that isn't listed as "already built" above and isn't in your own scope,
create the minimal version yourself under its standard shadcn path (e.g.
`components/ui/button.tsx`) rather than duplicating it elsewhere or blocking on it.

## Verification expected from you

Before finishing, run (from `/home/claude/havena`):
```
npx tsc --noEmit
```
Fix any type errors in files you own. Don't worry about errors in files outside your scope —
another agent owns those. Report which files you created/edited and any known gaps.
