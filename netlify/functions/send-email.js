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

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

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
