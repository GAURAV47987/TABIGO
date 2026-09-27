-- Run this once in your new Supabase project's SQL Editor.
-- Requires email/password auth to be enabled (it is, by default).

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination_name text not null,
  destination_lat double precision,
  destination_lng double precision,
  start_date date not null,
  end_date date not null,
  itinerary jsonb not null default '[]',
  budget jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

-- Each user can only ever see/change their own trips.
create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);

create policy "trips_insert_own" on public.trips
  for insert with check (auth.uid() = user_id);

create policy "trips_update_own" on public.trips
  for update using (auth.uid() = user_id);

create policy "trips_delete_own" on public.trips
  for delete using (auth.uid() = user_id);

create index if not exists trips_user_id_idx on public.trips(user_id);
