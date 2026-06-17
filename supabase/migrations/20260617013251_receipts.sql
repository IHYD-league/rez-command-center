-- RS-1: receipts table — the metadata + image pointer + parsed payload
-- for a receipt scan. Lives alongside shopping_items, completions,
-- etc. as a per-family table. Image bytes live in family-photos
-- storage at receipts/<family_id>/<uuid>.jpg; this row keeps the path
-- plus all extracted metadata.
--
-- ocr_raw is the load-bearing payload. RS-2 will read
-- ocr_raw.items_reviewed (a structured contract — see the RS-1 spec
-- "promotion contract" check) and mint immutable rows in the future
-- purchases table. Every field RS-2 needs to write a complete
-- purchase row (title, brand, qty, unit, unit_price, line_total,
-- confirmed_shopping_item_id, source) is captured here at commit
-- time. RS-1 does NOT write purchase rows; it lands the receipt with
-- its parsed-and-reviewed payload, ready for RS-2 to promote.
--
-- Soft-delete via deleted_at matches Black's gifted_stars pattern
-- (mig 20260613233000). Receipts are metadata, not financial math —
-- losing one shouldn't change a sum, and the user may want to
-- "untrash" a wrongly-scanned receipt later. Purchases (RS-2) use a
-- strict void-row pattern instead because there the math IS the
-- truth and soft-delete + WHERE filters get forgotten.
--
-- store_chain is FREE TEXT, normalized lower+trim on the client. No
-- CHECK enum: a check constraint can't predict every store a family
-- shops at (Sprouts, Stater Bros, Smart & Final, the local co-op)
-- and would require a migration every time a new chain appears in
-- the wild.

create table if not exists public.receipts (
  id              text primary key,
  family_id       uuid not null references public.families(id) on delete cascade,
  image_path      text not null,
  store_name      text,
  store_chain     text,
  store_label     text,
  purchased_at    timestamptz not null,
  subtotal        numeric(10,2),
  tax             numeric(10,2),
  total           numeric(10,2),
  currency        text not null default 'USD',
  ocr_raw         jsonb not null,
  parsed_status   text not null default 'parsed'
                  check (parsed_status in ('pending','parsed','review','error')),
  uploaded_by     text references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- chronological browse (the primary read path; RS-3 reads from here).
create index if not exists receipts_family_idx
  on public.receipts(family_id, purchased_at desc);

-- by-store views (RS-3 spending-by-store aggregations).
create index if not exists receipts_chain_idx
  on public.receipts(family_id, store_chain, purchased_at desc)
  where store_chain is not null;

-- pending retry surface (very small partial; for "you have N receipts
-- still parsing" prompts).
create index if not exists receipts_pending_idx
  on public.receipts(family_id)
  where parsed_status = 'pending';

-- the live list (soft-delete-aware fast path).
create index if not exists receipts_active_idx
  on public.receipts(family_id, purchased_at desc)
  where deleted_at is null;

alter table public.receipts enable row level security;
alter table public.receipts force  row level security;

drop policy if exists receipts_rw_my_family   on public.receipts;
drop policy if exists receipts_delete_parents on public.receipts;

-- Generic family read/insert/update — matches shopping_items shape.
-- Updates allowed because the user may correct store_label /
-- purchased_at / totals after commit; receipts is metadata, not the
-- immutable spine.
create policy receipts_rw_my_family
  on public.receipts
  for all
  to authenticated
  using      (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

-- Hard delete is the safety valve for parents to purge images
-- permanently. Soft-delete via deleted_at is what the UI does.
create policy receipts_delete_parents
  on public.receipts
  for delete
  to authenticated
  using (public.is_parent() and family_id = public.my_family_id());

comment on table public.receipts is
  'Receipt scans — image pointer + parsed metadata + ocr_raw payload. RS-2 promotes ocr_raw.items_reviewed into purchases rows; the contract is documented in the RS-1 spec.';
comment on column public.receipts.store_chain is
  'Normalized lowercase chain ("costco" / "trader_joes" / "sprouts"...). FREE TEXT — no enum, grows from real data.';
comment on column public.receipts.purchased_at is
  'Receipt date. Editable in the scanner UI for backfill (scan old receipts → set the real historical date).';
comment on column public.receipts.ocr_raw is
  'Vision-parse response + reviewed items array. RS-2 reads ocr_raw.items_reviewed (the promotion contract) to mint purchases rows. Original vision response preserved under ocr_raw.vision for re-review.';
comment on column public.receipts.parsed_status is
  'pending = upload landed, vision pending. parsed = ocr_raw populated, user reviewed and committed. review = parsed but flagged for re-review. error = vision-parse failed.';
comment on column public.receipts.deleted_at is
  'Soft-delete marker. UI sets this; image stays in storage (Mike: keep forever per RS-1 decisions). Parents can hard-delete via receipts_delete_parents policy as a safety valve.';

-- Integrity probe — receipts is a new table, doesn't touch stars.
-- After applying, snapshot then re-check the star total; it must be
-- unchanged (delta-form canary).
--   select sum(awarded_stars) from public.completions
--    where status = 'approved'
--      and family_id = (select id from public.families where name = 'Lynch');
