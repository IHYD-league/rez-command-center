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

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

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
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

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
