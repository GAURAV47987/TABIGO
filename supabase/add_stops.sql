-- Run this once in the SQL Editor (after the earlier migrations).
-- Adds multi-stop support: a trip can now be a sequence of cities, each
-- with its own day count, instead of a single destination.

alter table public.trips
  add column if not exists stops jsonb not null default '[]';
