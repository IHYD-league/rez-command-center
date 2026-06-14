# Paywall + Upgrade Flow Sketch · 2026-06-14

Builds on the tier numbers in `AUDIT-2026-06-13-TRUST-AND-COST.md`. Those numbers stand:

- **Free** — 1 kid + 2 parents, 50 photos/mo, 250 MB cap, 90-day history
- **Paid $4.99/mo** — unlimited photos (soft 500/mo), 2 GB cap, unlimited history, unlimited helpers
- **Sibling +$2/mo** — each additional kid profile

This doc answers: how do free users hit the wall, how do they upgrade, **how Mike (the administrator) can gift memberships to chosen families**, and what does that take to build.

---

## Principle: friendly cap, never a feature wall

What's behind the cap matters. The lesson from every parenting app that lost trust: **don't paywall the kid's data**. Mike's audit memory makes this concrete — trust is the product. So:

- **Never paywalled:** quests, streaks, stars, audit trail, data export, the kid's view, multilingual.
- **Capped (free hits a soft limit):** photo upload, history depth, profile count.
- **Paid-only:** insights deep dives, custom stat templates, board-game premium themes, family-network features (when those land).

A free family always sees everything they've already saved. The paywall meters *new* growth, not *existing* memories.

---

## Granted memberships (admin gifting)

Mike (admin) can gift a paid membership to any family — close friends, beta testers, grandparents, anyone he wants on the app without billing them. A granted membership is functionally identical to a Stripe-paid one (same caps lift, same surfaces unlock) but:

- **No Stripe customer / no Stripe subscription** — pure DB state.
- **`granted_by` records which admin gave it** so the audit trail answers "who comped this family?" forever.
- **Expires when Mike says it does** — `current_period_end` can be set to a real date (1-year gift) or `infinity` (permanent comp).
- **Revocable** — admin can revoke; family drops to free at next session load. Family keeps their data; only the caps reapply going forward (per the "never paywall existing memories" rule).
- **Self-comp for testing** — Mike's own family is comped from launch; he never sees the paywall on his own account by accident.

UI lives in the existing **Admin panel** (gated by `profiles.is_admin`). New section *Grant memberships*:

```
[ Grant a membership ]
  Family:    [ search by email or family name ]
  Tier:      ( ) Paid    ( ) Paid + 1 sibling    ( ) Paid + 2 siblings
  Until:     [ 2027-06-14 ▼ ]   or  [ ✓ Permanent ]
  Note:      [ "beta tester — Krissie's sister" ]
  [ Grant ]

Current grants
  • The Schmidt family   · paid · until 2027-06-14 · by Mike  [ Revoke ]
  • The Hayes family     · paid + 1 sibling · permanent · by Mike  [ Revoke ]
```

Revoke flips `status='canceled'` and clears `current_period_end`. Both grant and revoke append to a `subscription_events` audit row (same `extra.history`-style append-only pattern used for completions).

---

## Three paywall surfaces

### 1. Photo cap (soft → hard at 50)

When a free family hits 40/50 photos this month, the photo upload tile shows a small chip: `40/50 this month`. At 50, the next upload attempt opens an **upgrade sheet** (not an error toast):

> 🎉 You've logged 50 moments this month — that's a busy family.
>
> **Keep going** with unlimited photos and a 4-year storage window for **$4.99/mo**.
>
> [ Upgrade ]   [ Maybe later ]

"Maybe later" is the friendly path — the upload waits as a draft (per the auto-save-draft rule). When the month rolls over, the draft becomes uploadable.

### 2. History fade (90-day archive)

In Insights and Stats hero cards, days older than 90 render with a `--` and a small lock chip: `🔒 Archive · Upgrade to unlock`. Tapping the chip opens the same upgrade sheet. The data isn't deleted — it's queryable on upgrade. This is the strongest pull: parents love looking back.

### 3. Adding a kid

The "Add kid" button on More → Family shows the sibling price inline:

> **Add a second kid** — +$2/mo
>
> Each kid gets their own quests, streaks, photos, and rewards.
>
> [ Add for +$2 ]

No surprise charge — the price is on the button.

---

## Upgrade flow (Stripe Checkout)

**Why Stripe Checkout, not in-app purchase:** Apple/Google take 30% and require IAP for digital subscriptions inside their apps. We're a web app installed via "Add to Home Screen", so Stripe is allowed. It's also the fastest path — one hosted page, no IAP review, no platform compliance work.

```
[ Upgrade tap ]
   ↓
POST /api/create-checkout-session  (Netlify function)
   • family_id, plan: "paid" | "paid+sibling_1" | etc.
   • returns: { url }
   ↓
window.location = stripe.url
   ↓
Stripe Checkout (hosted)
   ↓
success_url → /upgrade-success?session_id=…
   ↓
GET /api/checkout-session/:id (Netlify function)
   • verifies session.payment_status === "paid"
   • UPSERT public.subscriptions { family_id, stripe_customer_id, stripe_sub_id, tier, status, current_period_end }
   • returns 200
   ↓
Client refreshes family → tier="paid" → caps lift
```

**Webhook for the lifecycle:**
- `customer.subscription.updated` / `.deleted` → flip `tier` column
- `invoice.payment_failed` → 7-day grace period, then downgrade
- Cancellation downgrades at `current_period_end`, not immediately

---

## Schema (one migration)

```sql
create table public.subscriptions (
  family_id uuid primary key references public.families(id) on delete cascade,
  -- Source: 'stripe' (paid via checkout) or 'granted' (comped by admin).
  -- Drives the downgrade flow + which UI surfaces appear in the family's
  -- own settings (granted families see "Gifted by Mike" instead of
  -- "Manage billing").
  source text not null default 'stripe',
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text not null default 'free',     -- 'free' | 'paid'
  sibling_count integer not null default 0,
  status text not null default 'active', -- 'active' | 'past_due' | 'canceled'
  current_period_end timestamptz,        -- nullable = permanent grant
  -- Admin gifting fields. NULL for normal Stripe subs.
  granted_by uuid references public.profiles(id),
  granted_at timestamptz,
  granted_note text,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy subs_read on public.subscriptions for select
  using (family_id = my_family_id());
-- writes are server-only via service role in the Netlify functions

-- Append-only audit log for every grant / revoke / Stripe webhook event.
-- Mirrors the extra.history pattern from completions.
create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid references public.profiles(id),    -- NULL for Stripe-system events
  kind text not null,  -- 'granted' | 'revoked' | 'stripe.activated' | 'stripe.past_due' | 'stripe.canceled' | ...
  payload jsonb,
  at timestamptz not null default now()
);
alter table public.subscription_events enable row level security;
create policy sub_events_read on public.subscription_events for select
  using (family_id = my_family_id());
```

`families.tier` derived via join on read. Most surfaces only need `tier === "paid"` and the photo count for the month.

**Admin write path** (granting a membership): a Netlify function `grant-membership.js` runs under the service role, checks the caller's session profile has `is_admin = true`, then upserts the `subscriptions` row with `source='granted'`, fills `granted_by/granted_at/granted_note`, and writes a `subscription_events` row with `kind='granted'`. Same shape for `revoke-membership.js`.

---

## Client-side quota helper

One module, one source of truth:

```js
// src/lib/quota.js
export const QUOTAS = {
  free: { photosPerMonth: 50, storageMB: 250, historyDays: 90, kids: 1 },
  paid: { photosPerMonth: 500, storageMB: 2048, historyDays: Infinity, kids: 1 },
};
export function quotaFor(family, subscription) {
  // Paid via Stripe OR granted by admin both map to the paid bucket.
  // Status must be 'active' (granted-then-revoked drops to free).
  // current_period_end null = permanent grant (no expiry check needed).
  const now = Date.now();
  const isPaidActive =
    subscription
    && subscription.tier === "paid"
    && subscription.status === "active"
    && (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() > now);
  const base = QUOTAS[isPaidActive ? "paid" : "free"];
  return { ...base, kids: base.kids + (subscription?.siblingCount || 0) };
}
export function photosUsedThisMonth(albumPhotos, completions, gifted) { /* count paths created since month-start */ }
export function storageUsedMB(...) { /* sum bytes from albumPhotos.size_bytes — needs a new column */ }
```

Surfaces call `quotaFor(family, sub)` and `photosUsedThisMonth(...)`, compare, render the chip / sheet.

---

## Build order (smallest viable launch)

1. **Migration** — `subscriptions` + `subscription_events` tables + `albumPhotos.size_bytes` (so the storage cap is real not theoretical). Self-grant Mike's family at creation time so he never paywalls himself.
2. **Admin grant flow first** — `grant-membership.js` / `revoke-membership.js` Netlify functions + admin UI. This unblocks Mike comping the first few friend families *before* Stripe is wired, so they can use the full app while Mike collects feedback.
3. **Client quota helper** — `src/lib/quota.js`
4. **Stripe Checkout** — `create-checkout-session.js`, `checkout-session.js`, `stripe-webhook.js`
5. **Photo cap surface** — soft chip + upgrade sheet. Ship it, watch what happens with one new free family.
6. **History fade** — second paywall surface, after the photo cap proves the soft-cap UX feels OK
7. **Add-kid pricing** — third paywall surface, after the first two are stable

Each step is its own branch. Steps 1–3 can land before any paywall actually fires — the column defaults are `tier='free'`, but the 50-photo cap stays unmeasured until the photo-count code lands. Reversible at every step.

The deliberate ordering: **granted memberships before Stripe** means Mike can invite the first wave of families (the ones already asking) with a single click each, no payment friction, and gather real usage data before the public paywall ever fires.

---

## Family-facing membership card

A small card in **More → Privacy & Safety** shows the family their current status. Three states:

- **Free** — "50 photos this month · 12 used. Upgrade for unlimited."  [ Upgrade ]
- **Paid (Stripe)** — "Paid member since Mar 2026 · renews Jul 14."  [ Manage billing ]
- **Granted (comped)** — "Gifted by Mike Lynch · 11 months remaining" *(or* "permanent")*  — no billing CTA. Optional friendly note: "If you'd like to support the project, you can switch to a paid membership anytime."*

This is the only place Mike's name appears to the gifted family. It's transparent without making the gift feel transactional.

---

## What's NOT in this sketch (intentionally)

- **Apple/Google IAP** — only if we publish a native app. PWA stays web-only for v1.
- **Annual pricing** — defer until 100+ paid families; not worth the SKU complexity yet.
- **Promo codes / referrals** — Stripe supports them out of the box; wire them when a second family asks.
- **Multi-family network features** — those are separate from tiering. Could be free or paid; decide when the feature shape is clearer.

---

## Decisions Mike needs to make

1. Confirm the cap numbers (50 photos / 250 MB / 90 days / 1 kid) hold up against what real families actually use. The drum-photo flow alone might burn through 50/mo for a busy kid. **If it's too tight, "free" becomes a demo not a tier.**
2. Confirm $4.99 / +$2 sibling. Round numbers ($5 / +$2) would simplify Stripe and feel less "app-storey."
3. **Trial?** A 14-day free trial of paid (no card required) is a strong nudge that costs us a Stripe webhook tweak — worth it if Mike believes parents will commit faster after seeing unlimited history.
