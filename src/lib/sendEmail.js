// Client wrapper around the /api/send-email Netlify function.
//
// Auth: every call attaches the signed-in user's Supabase access
// token. The function rejects any request without a valid token + a
// family-member profile before burning the Resend API key. If the
// session is missing client-side (extremely rare — they're signed
// in everywhere else in the app), we surface a clean "Please sign
// in again" instead of calling an endpoint that's going to 401.
//
// Shape mirrors src/lib/visionScan.js so future readers see the same
// auth-attach convention twice across the two paid-API functions.

import { supabase } from "./supabase.js";

export async function sendEmailViaApi({ to, subject, html, text, replyTo } = {}) {
  if (!supabase) throw new Error("Sign-in isn't configured. Please sign in and try again.");
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token || null;
  if (!accessToken) throw new Error("Please sign in again before sending email.");

  const r = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, subject, html, text, replyTo }),
  });
  return r.json();
}
