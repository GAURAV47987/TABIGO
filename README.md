# TABIGO

A trip planner for any destination, for anyone who signs up — the public,
multi-user rebuild of the personal Europe trip planner. Built with
Vite + React + Tailwind, backed by Supabase (real accounts, not anonymous
pairing codes).

## What's here so far

- **Logo** (`src/assets/tabigo-logo.webp`) — shown on the sign-in screen
  and the Dashboard header in place of the plain "TABIGO" text. Not yet
  used as the actual installed-app icon (`vite.config.js`'s PWA
  `manifest.icons` is still empty) — the wordmark is a wide horizontal
  lockup, not a square mark, so that'd want a separate cropped icon
  variant.
- **Real accounts** — email/password signup and sign-in via Supabase Auth
  (`src/supabase.js`), with email confirmation.
- **Profile screen** — shows the signed-in email and member-since date, a
  "Plan: Free" placeholder (the natural future home for subscription
  status once payment gating exists), change-password, and Sign out
  (moved here from a small header link). Open via the profile icon next
  to Admin on the dashboard. Also lets you upload a profile photo (public
  Supabase Storage bucket, `supabase/add_avatars_bucket.sql`) — the
  object's filename is always your own user id, so re-uploading just
  replaces it, and RLS-equivalent storage policies mean you can only ever
  upload/replace/delete your own, while anyone can view any avatar (which
  is fine — it's just a small photo, not sensitive data).
- **Multi-trip, any-destination data model** — a `trips` table (one row per
  trip, owned by a `user_id`, gated by Row Level Security so a user can only
  ever see their own trips), instead of one hardcoded itinerary.
- **Home screen** — its own fixed bottom bar: **Trips** (your trip list,
  moved out of being the default view into its own tab), a raised center
  **+** button (opens New Trip from anywhere, then lands you on the Trips
  tab with the new one in it, rather than opening it directly), and
  **Explore** (placeholder for now — future destination-browsing ideas).
  The Home tab itself shows **ready-made itineraries** (`src/templates.js`,
  `src/TemplatePreview.jsx`) — researched, day-by-day routes for popular
  destinations (Japan's Tokyo/Kyoto/Osaka route is the first one, at the
  same level of specificity as a real hand-built itinerary: named
  neighborhoods and restaurants, actual train routes with durations and
  fares, timing tips, not generic AI output). Tapping one opens a full
  preview of every day before committing to anything; "Use this" asks for
  a start date, then creates the trip with its stops and entire itinerary
  pre-filled — the same multi-stop, dates-optional trip underneath, so
  every other feature (Budget, Map, Packing) just works on it immediately.
- **New trip wizard** (`src/NewTripWizard.jsx`) — a full-page 4-step flow
  (not a popup) instead of one long form, so a long suggestion list has
  real room instead of hiding most of itself in a small scrollable box:
  (1) *Where are you going?* — type a city, or a whole country to see the
  country itself listed first (pick it to plan the trip around the whole
  country as one stop), then its states/regions, then its biggest cities
  (`src/geonames.js`); (2) *Your route*
  — a destination photo with a passport-style "stamp" overlay, plus a
  connected-dot **journey strip** for the stop sequence (tweak days per
  stop or add more stops right there); (3) *When are you going?* — start
  date, home currency, and a live climate chip ("☀ Expect around 24°C,
  mostly dry") computed the moment a date is picked (`src/weather.js`);
  (4) *Popular add-ons* — Gemini suggests genuinely worth-visiting places
  near your first stop, shown as tappable stamp cards with a one-line
  reason each, instead of a plain list — tap to add or remove from the
  route, then create the trip. Suggestions are cached app-wide by
  destination name (`supabase/add_place_suggestions_cache.sql`, same idea
  as the photo cache below) — the first person to ask about a destination
  pays Gemini's few-second latency, everyone after that gets it instantly.
  If you add more than two stops this way (or any way), the trip's
  auto-generated name shows just the first stop plus a count ("Istanbul
  +3 more") instead of chaining every stop's name together, which got
  unreadable fast. The start date is optional — not sure yet?
  Skip it and create the trip anyway; the Itinerary tab will ask for a
  start date the first time you open it, and sets every stop's dates
  automatically from the day counts you already gave them, same as the
  wizard would have. A trip is a sequence of one or more **stops**
  (`src/stops.js`): the wizard sequences each stop's dates automatically
  from the trip's start date, once it has one. Free-typed text with no
  autocomplete pick falls back to geocoding via OpenStreetMap's Nominatim
  (`src/geocode.js`) at continue time. A single-stop trip works exactly
  like a single destination; multi-stop trips (e.g. an Athens → Paris →
  Amsterdam Europe trip) get a per-day city label in the Itinerary and a
  route line on the Map. Older trips created before this existed still
  work — they're treated as one implicit stop spanning their original
  dates.
- **Postcard Journal theme** — ported as-is from the personal app
  (`src/index.css`): kraft-paper background, ink-navy/stamp-red/tape-gold
  accents, light/dark mode tokens.
- **Destination photos** (`src/photos.js`, `src/PlacePhoto.jsx`) — a real
  photo of each trip's first stop as a banner on its dashboard card and
  Trip Hub header, via the Pexels API. Looked up once per trip, ever: the
  found photo (or the fact that none was found) is saved permanently to
  that trip's own `photo_url` column, so re-opening or re-viewing a trip
  never re-queries Pexels — only genuinely new trips do. A whole-country
  name ("Vietnam") is redirected to its biggest city first ("Ho Chi Minh
  City"), which searches far better than the country name itself — for
  ~115 commonly planned countries that's a hand-picked, instant lookup
  (`TOP_CITY` in `src/geonames.js`) with no network call at all; any other
  country falls back to a live GeoNames lookup. Either way, the resolved
  photo is also saved to a shared `place_photos` table
  (`supabase/add_place_photos_cache.sql`) keyed by place name, so the very
  first trip (anyone's, not just yours) to ask about a given place pays
  the lookup cost once, and every trip after that — across every user —
  gets it instantly from the database instead of re-querying GeoNames/
  Pexels. This is what keeps photo lookups fast as more people use the
  app, rather than slower. Falls back to a themed gradient while loading
  or when no photo exists for that name.
- **Trip Hub** — a fixed bottom tab bar (Itinerary / Budget / Convert / Map
  / Pack), same width as the app's own phone-size frame rather than the
  full viewport, instead of a top pill row — the standard mobile-app
  navigation pattern.
- **Itinerary** (`src/Itinerary.jsx`) — one day card per day of the trip,
  auto-generated from its dates, labeled with which stop that day belongs
  to on multi-stop trips; add/edit/delete time-optional plan items. A
  "Generate itinerary with AI" card drafts a full day-by-day plan
  (activities, named lunch/dinner spots, and at most one iconic
  "must-visit photo spot" for the whole trip) via Gemini
  (`supabase/functions/generate-itinerary`), planned strictly around the
  stops you actually listed — it can't invent its own cities — appended
  straight into the same editable itinerary. Nothing is gated behind
  payment yet. Each plan item can optionally have a Location (geocoded
  via Nominatim on save) — items with one show a small pin icon and
  appear on the Map, connected by a route line in chronological order.
- **Budget** (`src/Budget.jsx`) — add/edit/delete expenses in any of ~25
  major world currencies, converted to the trip's own `home_currency`
  (picked at trip creation) instead of a hardcoded currency. Category
  breakdown chart, PDF export (jsPDF).
- **Currency converter** (`src/Converter.jsx`) — live FX rates (free,
  keyless API, cached offline), convert between any of the ~25 supported
  currencies, quick-reference table into the trip's home currency.
- **Map** (`src/TripMap.jsx`) — Leaflet map with three kinds of pins, each
  its own color with a legend: stops (red, connected by a route line on
  multi-stop trips), itinerary plan items that have a Location set (gold,
  connected in chronological order — so building out the itinerary
  actually draws the day-by-day route), and pins you add directly by
  typing any place name (blue, geocoded the same way as a stop).
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
