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
- **Trip Hub** — placeholder screen after creating/opening a trip; this is
  where Itinerary, Budget, Maps, Packing, etc. get ported in next.

## Not built yet (next steps)

- Itinerary tab: manual day-by-day builder (free) + AI-generated draft
  itinerary (paid)
- Budget tracker (ported from the personal app, unlimited manual entries;
  AI receipt-scan/smart-add capped on the free tier)
- Currency converter, maps, packing list (ported, destination-agnostic
  already)
- Payment/subscription gating (Stripe)
- Dark mode toggle, PWA install support

## Setup

1. Create a new Supabase project at supabase.com.
2. In its SQL Editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill in your project's URL and anon
   key (Project Settings → API).
4. `npm install`
5. `npm run dev`

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.
