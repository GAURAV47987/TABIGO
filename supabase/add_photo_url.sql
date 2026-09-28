-- Run this once in the SQL Editor (after the earlier migrations).
-- Stores each trip's resolved destination photo permanently, so the
-- Pexels API is only ever called once per trip, not once per view.
-- null = never looked up yet; '' = looked up, no photo found; a URL =
-- found and cached for good.

alter table public.trips add column if not exists photo_url text;
