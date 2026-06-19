// Resend transactional email proxy.
//
// Why a Netlify function instead of direct browser → Resend: API keys
// must never live in client bundles. The function reads the key from
// Netlify env vars (RESEND_API_KEY) and calls Resend's REST API on
// the browser's behalf. The browser never sees the key.
//
// Status returned to the client:
//   "ok"                  — email sent
//   "email_not_configured" — RESEND_API_KEY env var missing (graceful
//                           fail; UI surfaces a clear "Email isn't
//                           set up yet" banner instead of throwing)
//   "send_failed"          — Resend returned a non-2xx; details in body
//
// Mike's setup steps (when at a computer or from phone):
//   1. Resend dashboard → API Keys → create one
//   2. Netlify dashboard → Environment variables → RESEND_API_KEY = …
//   3. Optional: RESEND_FROM_ADDRESS = "Family Command Center <digest@<verified-domain>>"
//      Falls back to "onboarding@resend.dev" (Resend's sandbox sender)
//      until a domain is verified.
//   4. Trigger a Netlify redeploy so the env var loads
//   5. In-app: More → Email Setup → Send test

import { createClient } from "@supabase/supabase-js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Auth gate. Mirrors the vision-parse.js gate verbatim (intentional
// duplication — Netlify bundling sometimes mis-resolves shared paths,
// and a broken import on a security function is worse than ~40
// duplicated lines). When a third function joins, extract to a shared
// module then. As of 2026-06-18 every caller must be a signed-in
// Supabase user AND a member of some family (a row in public.profiles
// tied to their auth_user_id). Both checks run BEFORE the body is
// parsed and BEFORE Resend is called so a rejected request never burns
// the RESEND_API_KEY.
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

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  // Auth gate runs BEFORE body parsing + BEFORE Resend is called.
  // A rejected request never burns the RESEND_API_KEY.
  const auth = await verifyCaller(req);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        status: "email_not_configured",
        hint: "RESEND_API_KEY env var is not set. See netlify/functions/send-email.js header for setup steps.",
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

  const to = Array.isArray(body.to) ? body.to : (body.to ? [body.to] : []);
  const subject = (body.subject || "").trim();
  const html = body.html || "";
  const text = body.text || "";

  if (to.length === 0 || !subject || (!html && !text)) {
    return new Response(JSON.stringify({ status: "missing_fields", needs: ["to", "subject", "html|text"] }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const from = process.env.RESEND_FROM_ADDRESS || "Family Command Center <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
        // reply_to so a parent can hit Reply in their inbox and
        // their message goes back to the family admin.
        reply_to: body.replyTo || undefined,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(
        JSON.stringify({ status: "send_failed", resendStatus: res.status, detail: payload }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ status: "ok", id: payload.id }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ status: "send_failed", detail: String(e?.message || e) }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }
};
