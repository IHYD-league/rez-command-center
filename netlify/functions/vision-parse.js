// Universal vision parser — pipes a parent's photo through Claude
// Vision and returns structured JSON the client can preview before
// committing to the DB. Used by the "📷 Scan to add" flow on the
// Shopping List, Calendar, and future surfaces.
//
// Status returned to the client:
//   "ok"                    — parsed payload in .data
//   "vision_not_configured" — ANTHROPIC_API_KEY env var missing
//                             (graceful fail; UI surfaces banner)
//   "parse_failed"          — Anthropic returned a non-2xx OR the
//                             content wasn't valid JSON
//
// Mike's setup steps (see reference_anthropic_vision_api.md memory):
//   1. console.anthropic.com → API keys → create
//   2. Netlify → env vars → ANTHROPIC_API_KEY = <paste>
//   3. Trigger redeploy

import { createClient } from "@supabase/supabase-js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// Auth gate. The function used to accept any POST — anyone with the
// URL could burn the Anthropic key OR feed fake "receipts" into the
// parser. As of 2026-06-18 every caller must be a signed-in Supabase
// user AND a member of some family (a row in public.profiles tied to
// their auth_user_id). Both gates run BEFORE the body is parsed and
// BEFORE the Anthropic call so a rejected request costs nothing.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function verifyCaller(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, response: jsonResponse({ status: "auth_misconfigured" }, 500) };
  }
  const authHeader = req.headers.get("authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return { ok: false, response: jsonResponse({ status: "unauthorized", reason: "missing_bearer" }, 401) };
  }
  const token = m[1].trim();
  // Use the user's bearer as the client's Authorization header so the
  // profiles lookup runs through RLS as that user (they can read their
  // own profile, can't enumerate others). No persisted session — this
  // is a single-shot verification per request.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, response: jsonResponse({ status: "unauthorized", reason: "invalid_token" }, 401) };
  }
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return { ok: false, response: jsonResponse({ status: "unauthorized", reason: "not_a_family_member" }, 401) };
  }
  return { ok: true };
}

// Per-kind prompts. Each must instruct Claude to return ONLY a JSON
// object matching the per-kind response shape. Claude is excellent at
// this when asked clearly + given a schema example.
const PROMPTS = {
  shopping_list: `You're reading a handwritten or typed shopping list. Extract every item the parent wants to buy.

Skip items that are visibly crossed out (already bought / no longer needed). Skip headers like "GROCERIES" or "STORE". Combine an item with its quantity if both are written ("2 lbs ground beef" stays as one item).

Return ONLY a JSON object in this exact shape, nothing else:
{
  "items": [
    { "title": "milk" },
    { "title": "eggs (dozen)" },
    { "title": "bananas" }
  ]
}

If the image isn't a shopping list (it's a calendar, a flyer, etc.), return { "items": [] } and nothing else.`,

  shopping_product: `You're looking at a photo of a single grocery product, packaging, or empty container. Extract the title and brand so the parent can re-add this exact item to their shopping list.

- title: the generic product (e.g. "Peanut butter", "Cereal", "Pasta sauce") — what a parent would write on a list, NOT the marketing name.
- brand: the brand on the label (e.g. "Jif", "Honey Nut Cheerios", "Rao's"). Combine sub-brand + variant if both matter ("Honey Nut Cheerios", "Tide Pods Spring Meadow").

If multiple distinct products appear in the photo, return all of them. If you can't make out the title or brand clearly, leave that field as an empty string rather than guessing.

Return ONLY a JSON object in this exact shape, nothing else:
{
  "items": [
    { "title": "Peanut butter", "brand": "Jif" },
    { "title": "Cereal", "brand": "Honey Nut Cheerios" }
  ]
}

If the image isn't a product photo, return { "items": [] } and nothing else.`,

  schedule: `You're reading a schedule, sports program, school calendar, or any image listing events at specific dates/times. Extract every distinct event.

For each event, extract:
- title (e.g. "Game vs Bears", "Practice", "Recital")
- date in YYYY-MM-DD format if shown; null if not
- time in HH:MM 24-hour format if shown; null if not
- durationMinutes if shown; null if not
- address if shown (free-text fine); null if not
- notes for anything else useful (jersey color, what to bring, etc.); null if not

Skip days that say "off" or "no game" or are clearly blank.

Return ONLY a JSON object in this exact shape, nothing else:
{
  "events": [
    { "title": "Game vs Bears", "date": "2026-09-12", "time": "10:00", "durationMinutes": 60, "address": "Pasadena Sports Center", "notes": "Home game · white jersey" },
    { "title": "Practice", "date": "2026-09-14", "time": "17:30", "durationMinutes": 90, "address": null, "notes": null }
  ]
}

If the image isn't a schedule, return { "events": [] } and nothing else.`,

  receipt: `You're reading a grocery, pharmacy, or general-store receipt. Extract:

- store_name: store as printed ("Costco Wholesale", "Trader Joe's #178", "CVS/pharmacy")
- store_chain: normalized lowercase short form. Prefer: "costco" / "trader_joes" / "vons" / "ralphs" / "whole_foods" / "walmart" / "target" / "cvs" / "sprouts" / "kroger" / "safeway" / "albertsons" / "publix" / "wegmans" / "aldi" / "heb" / "walgreens" / "rite_aid". For anything not on this list, lowercase the chain name and replace spaces with underscores ("rainbow_grocery", "smart_and_final"). If unidentifiable, use "other".
- purchased_at: date and time on the receipt, ISO 8601. "YYYY-MM-DDTHH:MM" if time visible, "YYYY-MM-DD" if only date.
- subtotal, tax, total: numeric values in USD as printed. null if not visible.

Plus an items array. For each PURCHASED PRODUCT line:
- title: generic product name a parent would write on a list ("Whipped Dressing", "Goldfish XL"), NOT the receipt's terse code ("GV WHP DRSG", "GLD FISH XL"). Translate abbreviations.
- brand: brand or store-brand label printed or abbreviated. Store-brand examples: Costco "KS" or "KIRKLAND" → "Kirkland"; Trader Joe's items → "Trader Joe's"; Great Value items → "Great Value". null if unclear.
- qty: quantity if visible; default 1.
- unit: "lb" / "oz" / "ea" if shown; null otherwise.
- unit_price: price per unit if printed.
- line_total: total for this line as printed.
- upc: the 12-13 digit barcode for the product, if printed in or next to the line (typical format on receipts: a numeric code printed under the item description, e.g. 681147071140). Numeric string of 8-14 digits. null if no barcode is printed for this line.

Skip non-product lines: subtotals, tax rows, "savings", coupons, discounts, "TOTAL" row, store address, cashier ID, payment lines, signatures, footers, "thank you" copy.

Return ONLY a JSON object in this exact shape, nothing else:
{
  "store_name": "Costco Wholesale",
  "store_chain": "costco",
  "purchased_at": "2026-06-12T18:23",
  "subtotal": 142.45,
  "tax": 7.12,
  "total": 149.57,
  "items": [
    { "title": "Whipped Dressing", "brand": "Great Value", "qty": 1, "unit": "ea", "unit_price": 4.99, "line_total": 4.99, "upc": "078742052830" },
    { "title": "Goldfish XL", "brand": "Pepperidge Farm", "qty": 2, "unit": "ea", "unit_price": 7.49, "line_total": 14.98, "upc": null }
  ]
}

If the image isn't a receipt, return { "items": [] } and nothing else.`,
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  // Auth gate runs BEFORE body parsing + BEFORE the Anthropic call.
  // A rejected request never burns the API key.
  const auth = await verifyCaller(req);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        status: "vision_not_configured",
        hint: "ANTHROPIC_API_KEY env var is not set. See netlify/functions/vision-parse.js header for setup.",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ status: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const kind = body.kind || "shopping_list";
  const prompt = PROMPTS[kind];
  if (!prompt) {
    return new Response(JSON.stringify({ status: "unknown_kind", kind }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const imageBase64 = body.imageBase64;
  const imageMediaType = body.imageMediaType || "image/jpeg";
  if (!imageBase64) {
    return new Response(JSON.stringify({ status: "missing_image" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        // temperature: 0 — deterministic mode. The Anthropic Messages
        // API defaults to 1.0 when omitted; that high randomness made
        // identical receipt images produce materially different
        // transcribed text run-to-run (Mike caught it 2026-06-25:
        // same receipt, 27 items vs 25, different titles + prices).
        // No `seed` param — Messages API doesn't support one; an
        // unknown field would 400 the call.
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: imageMediaType, data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(
        JSON.stringify({ status: "parse_failed", anthropicStatus: res.status, detail: payload }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    // Claude returns content as an array; the first text block is our JSON.
    const text = (payload.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    // Strip code fences if the model wrapped its response.
    const cleaned = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ status: "parse_failed", reason: "model returned non-JSON", raw: text.slice(0, 500) }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ status: "ok", kind, data }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ status: "parse_failed", detail: String(e?.message || e) }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }
};
