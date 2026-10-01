-- Run this once in the SQL Editor (after the earlier migrations).
-- A photo found for one trip (e.g. "new zealand") is reused for every
-- other trip and every other user that ever asks for the same place name,
-- instead of every trip paying its own GeoNames + Pexels lookup. An empty
-- photo_url means "already looked up, nothing found" (same convention as
-- the trips table's own per-trip photo_url).
create table if not exists public.place_photos (
  name text primary key,
  photo_url text not null default '',
  resolved_at timestamptz not null default now()
);

alter table public.place_photos enable row level security;

-- Every signed-in user can read and write the shared cache — it's just
-- stock photo URLs keyed by place name, not sensitive per-user data.
create policy "place_photos_select_signed_in" on public.place_photos
  for select to authenticated using (true);

create policy "place_photos_insert_signed_in" on public.place_photos
  for insert to authenticated with check (true);

create policy "place_photos_update_signed_in" on public.place_photos
  for update to authenticated using (true);
