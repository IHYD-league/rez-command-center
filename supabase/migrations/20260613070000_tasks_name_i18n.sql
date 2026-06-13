-- tasks.name_i18n — per-task multilingual title overrides.
--
-- Phase 2 of the multilingual roadmap (memory:
-- project_multilingual_roadmap.md). Phase 1 shipped a static map of
-- translations for seeded task ids — but the moment a parent adds a
-- custom task ("Tidy desk"), it stayed flat English in every mode.
--
-- This column stores a small jsonb keyed by lang code, e.g.:
--   {"en": "Tidy desk", "es": "Ordenar el escritorio"}
-- Empty {} is the safe default for existing rows and for any custom
-- task the parent leaves untranslated — the i18n helper falls back to
-- the static map first, then to task.title.
--
-- Schema is intentionally loose (no jsonb_schema enforcement) — same
-- shape as the existing extra columns on completions / gifted_stars.

alter table public.tasks
  add column if not exists name_i18n jsonb not null default '{}'::jsonb;

comment on column public.tasks.name_i18n is
  'Per-task multilingual title overrides. Keys are lang codes (en, es, …). The Phase 1 i18n map of seeded titles still applies; this column wins when present so a parent can translate custom tasks.';
