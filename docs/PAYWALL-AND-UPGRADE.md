# Paywall + Upgrade Flow Sketch · 2026-06-14

Builds on the tier numbers in `AUDIT-2026-06-13-TRUST-AND-COST.md`. Those numbers stand:

- **Free** — 1 kid + 2 parents, 50 photos/mo, 250 MB cap, 90-day history
- **Paid $4.99/mo** — unlimited photos (soft 500/mo), 2 GB cap, unlimited history, unlimited helpers
- **Sibling +$2/mo** — each additional kid profile

This doc answers: how do free users hit the wall, how do they upgrade, and what does that take to build.

---

## Principle: friendly cap, never a feature wall

What's behind the cap matters. The lesson from every parenting app that lost trust: **don't paywall the kid's data**. Mike's audit memory makes this concrete — trust is the product. So:

- **Never paywalled:** quests, streaks, stars, audit trail, data export, the kid's view, multilingual.
- **Capped (free hits a soft limit):** photo upload, history depth, profile count.
- **Paid-only:** insights deep dives, custom stat templates, board-game premium themes, family-network features (when those land).

A free family always sees everything they've already saved. The paywall meters *new* growth, not *existing* memories.

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
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text not null default 'free',     -- 'free' | 'paid'
  sibling_count integer not null default 0,
  status text not null default 'active', -- 'active' | 'past_due' | 'canceled'
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy subs_read on public.subscriptions for select
  using (family_id = my_family_id());
-- writes are server-only via service role in the Netlify functions
```

`families.tier` derived view (or just join on read). Most surfaces only need `tier === "paid"` and the photo count for the month.

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
  const base = QUOTAS[subscription?.tier === "paid" ? "paid" : "free"];
  return { ...base, kids: base.kids + (subscription?.siblingCount || 0) };
}
export function photosUsedThisMonth(albumPhotos, completions, gifted) { /* count paths created since month-start */ }
export function storageUsedMB(...) { /* sum bytes from albumPhotos.size_bytes — needs a new column */ }
```

Surfaces call `quotaFor(family, sub)` and `photosUsedThisMonth(...)`, compare, render the chip / sheet.

---

## Build order (smallest viable launch)

1. **Migration** — `subscriptions` table + `albumPhotos.size_bytes` (so the storage cap is real not theoretical)
2. **Netlify functions** — `create-checkout-session.js`, `checkout-session.js`, `stripe-webhook.js`
3. **Client quota helper** — `src/lib/quota.js`
4. **One surface first** — photo cap. Ship it, watch what happens with one new family.
5. **History fade** — second surface, after the photo cap proves the soft-cap UX feels OK
6. **Add-kid pricing** — third surface, after the first two are stable

Each step is its own branch. Steps 1–3 can land before any paywall actually fires — the column defaults are `tier='free'`, but the 50-photo cap stays unmeasured until the photo-count code lands. Reversible at every step.

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
