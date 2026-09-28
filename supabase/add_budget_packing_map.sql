-- Run this once in the SQL Editor (after schema.sql and admin.sql).
-- Adds storage for Budget, Packing, Map pins, and each trip's home currency.

alter table public.trips
  add column if not exists home_currency text not null default 'USD',
  add column if not exists packing jsonb not null default '{}',
  add column if not exists map_pins jsonb not null default '[]';
