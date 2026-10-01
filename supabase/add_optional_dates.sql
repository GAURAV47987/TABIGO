-- Lets a trip be created without dates yet (added later from the
-- Itinerary tab), instead of forcing a start/end date at creation time.
alter table trips alter column start_date drop not null;
alter table trips alter column end_date drop not null;
