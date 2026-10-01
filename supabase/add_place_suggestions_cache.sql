-- Run this once in the SQL Editor (after the earlier migrations).
-- The Gemini-backed "popular add-ons" suggestions (Step 4 of the new trip
-- wizard) took several seconds every single time, even for a destination
-- someone had already asked about — same shared-cache idea as
-- place_photos: the first person to ask about a destination pays the AI
-- call's latency, everyone after that gets it instantly from here.
create table if not exists public.place_suggestions (
  name text primary key,
  places jsonb not null,
  resolved_at timestamptz not null default now()
);

alter table public.place_suggestions enable row level security;

create policy "place_suggestions_select_signed_in" on public.place_suggestions
  for select to authenticated using (true);

create policy "place_suggestions_insert_signed_in" on public.place_suggestions
  for insert to authenticated with check (true);

create policy "place_suggestions_update_signed_in" on public.place_suggestions
  for update to authenticated using (true);
