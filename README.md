# TABIGO

A trip planner for any destination, for anyone who signs up — the public,
multi-user rebuild of the personal Europe trip planner. Built with
Vite + React + Tailwind, backed by Supabase (real accounts, not anonymous
pairing codes).

## What's here so far

- **Real accounts** — email/password signup and sign-in via Supabase Auth
  (`src/supabase.js`), with email confirmation.
- **Multi-trip, any-destination data model** — a `trips` table (one row per
  trip, owned by a `user_id`, gated by Row Level Security so a user can only
  ever see their own trips), instead of one hardcoded itinerary.
- **New trip flow** — type any destination ("Bali", "Lisbon", anything) and
  a date range; it's geocoded for free via OpenStreetMap's Nominatim
  (`src/geocode.js`), no API key needed, so weather/maps/currency will work
  for any place without a hardcoded city list.
- **Postcard Journal theme** — ported as-is from the personal app
  (`src/index.css`): kraft-paper background, ink-navy/stamp-red/tape-gold
  accents, light/dark mode tokens.
- **Trip Hub** — tabbed view (Itinerary / Budget / Convert / Map / Pack) for
  each trip.
- **Itinerary** (`src/Itinerary.jsx`) — one day card per day of the trip,
  auto-generated from its dates; add/edit/delete time-optional plan items.
  A "Generate itinerary with AI" card drafts a full day-by-day plan
  (activities, named lunch/dinner spots, and at most one iconic
  "must-visit photo spot" for the whole trip) via Gemini
  (`supabase/functions/generate-itinerary`), appended straight into the
  same editable itinerary. Nothing is gated behind payment yet.
- **Budget** (`src/Budget.jsx`) — add/edit/delete expenses in any of ~25
  major world currencies, converted to the trip's own `home_currency`
  (picked at trip creation) instead of a hardcoded currency. Category
  breakdown chart, PDF export (jsPDF).
- **Currency converter** (`src/Converter.jsx`) — live FX rates (free,
  keyless API, cached offline), convert between any of the ~25 supported
  currencies, quick-reference table into the trip's home currency.
- **Map** (`src/TripMap.jsx`) — Leaflet map centered on the trip's
  destination; add extra pins by typing any place name (geocoded the same
  way as the destination itself).
- **Packing list** (`src/Packing.jsx`, `src/weather.js`) — climate-aware:
  fetches free weather data for the destination/dates (live forecast within
  16 days, otherwise a same-calendar-dates estimate from the past two
  years) and shapes the clothing section around it (hot/cold/rainy),
  instead of one fixed list for every trip. Progress ring, per-trip
  checklist state.
- **Admin/developer account** — the email in `src/admin.js` (`isAdmin`) sees
  an "Admin" link that lists every trip from every user (via the
  `admin_list_trips` Postgres function, `supabase/admin.sql`), and is meant
  to be the account that never hits future free-tier limits — nothing is
  gated yet, but any paywall/limit logic added later should check `isAdmin`
  first and skip it for this account.

## Not built yet (next steps)

- AI receipt-scan / voice smart-add for Budget (paid feature)
- Payment/subscription gating (Stripe) — including gating the AI itinerary
  generator, which currently anyone can use for free
- Dark mode toggle, force-refresh button (PWA update UX)

The Supabase project URL and publishable ("anon") key are hardcoded in
`src/supabase.js`, same as the personal app — that key is meant to be
public-facing, and Row Level Security (see `supabase/schema.sql`) is what
actually protects the data, not secrecy of the key.

Deployed automatically to GitHub Pages on every push to `main` (see
`.github/workflows/deploy-pages.yml`).

## Setup

1. `npm install`
2. `npm run dev`

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.
