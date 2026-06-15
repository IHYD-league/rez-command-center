-- events.address — optional location for tap-to-open in Maps / Google
-- Maps / Waze. Activities already carry an `address` field (e.g. Swim
-- = "Rose Bowl Aquatics, 360 N Arroyo Blvd, Pasadena, CA 91103") so
-- the EventEditSheet auto-fills the field when the parent picks a
-- matching activity from the title autocomplete.
--
-- Safe & additive: nullable, no default change for existing rows.

alter table public.events
  add column if not exists address text;

comment on column public.events.address is
  'Optional free-text location. Tappable to open in Apple Maps / Google Maps / Waze.';
