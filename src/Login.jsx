import React, { useState } from "react";
import { supabase } from "./lib/supabase.js";

export default function Login() {
  // Four branches:
  //   signin     — existing account signing back in
  //   register   — joining an existing family (parent pre-staged their
  //                email, or the request_to_join queue takes them)
  //   newfamily  — starting a brand new family (Magnetta path)
  //   forgot     — request a password-reset email
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setInfo("");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) setErr(error.message);
        return;
      }

      if (mode === "forgot") {
        if (!email.trim()) { setErr("Enter your email first."); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) { setErr(error.message); return; }
        setInfo("Reset link sent. Check your email — you can close this tab once you've reset.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) { setErr(error.message); return; }

      // No session yet — email confirmation is on. DataProvider reads
      // the localStorage flag below on first sign-in and replays the
      // create_family call there. For "register" no flag is needed —
      // the existing request_to_join + claim_profile_by_email path
      // already handles the post-confirm flow.
      if (!data?.session) {
        if (mode === "newfamily") {
          try {
            window.localStorage.setItem("lyf_new_family_intent", JSON.stringify({
              parentName: name.trim(),
              familyName: familyName.trim() || null,
            }));
          } catch (_) { /* private mode — they'll need to re-enter on sign-in */ }
          setInfo("Account created. Check your email to confirm, then sign in and your family will be set up.");
        } else {
          setInfo("Account created. Check your email to confirm, then sign in. A parent will need to approve you before you can use the app.");
        }
        setMode("signin");
        return;
      }

      // Authenticated immediately (email confirmation off in this
      // environment, or the auth session attaches right away).
      if (mode === "newfamily") {
        const { error: rpcErr } = await supabase.rpc("create_family", {
          p_parent_name: name.trim(),
          p_family_name: familyName.trim() || null,
        });
        if (rpcErr) { setErr(rpcErr.message); return; }
        // DataProvider will load the new family + drop them into the
        // OnboardingWizard since profiles has the parent but no kid.
      } else {
        await supabase.rpc("request_to_join", { p_display_name: name.trim() || null });
        // AuthGate will swap to the app. DataProvider lands on
        // "pending_approval" or auto-links to a pre-staged profile.
      }
    } finally {
      setBusy(false);
    }
  };

  const swap = (next) => {
    setMode(next);
    setErr("");
    setInfo("");
  };

  const subtitle = {
    signin:    "Family sign-in",
    register:  "Join an existing family",
    newfamily: "Start a new family",
    forgot:    "Reset your password",
  }[mode];

  const submitLabel = busy
    ? (mode === "signin" ? "Signing in…" : mode === "forgot" ? "Sending…" : "Creating account…")
    : (mode === "signin" ? "Sign in" : mode === "newfamily" ? "Create family" : mode === "forgot" ? "Send reset link" : "Request access");

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-600 to-violet-700 flex items-center justify-center p-6 text-white"
      style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/15"
      >
        <div className="text-5xl text-center mb-2">🚀</div>
        <h1 className="text-2xl font-extrabold text-center tracking-tight">
          Command Center
        </h1>
        <p className="text-white/70 text-sm text-center mb-5">{subtitle}</p>

        <div className="flex bg-white/10 rounded-2xl p-1 mb-5 text-[11px]">
          <button
            type="button"
            onClick={() => swap("signin")}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${mode === "signin" ? "bg-white text-indigo-700" : "text-white/70"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => swap("register")}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${mode === "register" ? "bg-white text-indigo-700" : "text-white/70"}`}
          >
            Join
          </button>
          <button
            type="button"
            onClick={() => swap("newfamily")}
            className={`flex-1 py-1.5 rounded-xl font-bold transition ${mode === "newfamily" ? "bg-white text-indigo-700" : "text-white/70"}`}
          >
            New family
          </button>
        </div>

        {(mode === "register" || mode === "newfamily") && (
          <>
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Your name
            </label>
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-2xl bg-white/15 border border-white/15 px-3 py-2 mb-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
            />
          </>
        )}

        {mode === "newfamily" && (
          <>
            <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
              Family name <span className="text-white/40">(optional)</span>
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. The Magnetta Family"
              className="w-full rounded-2xl bg-white/15 border border-white/15 px-3 py-2 mb-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
            />
          </>
        )}

        <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl bg-white/15 border border-white/15 px-3 py-2 mb-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
        />

        {mode !== "forgot" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] uppercase tracking-wide text-white/60">Password</label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => swap("forgot")}
                  className="text-[11px] font-bold text-white/80 hover:text-white"
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={mode !== "signin" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-white/15 border border-white/15 px-3 py-2 mb-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
            />
          </>
        )}

        {err && (
          <div className="text-amber-200 text-sm mb-3" role="alert">
            {err}
          </div>
        )}
        {info && (
          <div className="text-emerald-200 text-sm mb-3" role="status">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-white text-indigo-700 font-bold py-2 active:scale-95 transition disabled:opacity-60"
        >
          {submitLabel}
        </button>

        <p className="text-center text-white/40 text-[11px] mt-6 leading-snug">
          {mode === "signin"
            ? "Don't have an account? Tap Join (existing family) or New family (start your own)."
            : mode === "newfamily"
              ? "You'll be the founding parent. You can add your kid's profile next."
              : mode === "forgot"
                ? "We'll email you a link to reset your password."
                : "A parent of an existing family will see your request and approve or deny it. If they pre-staged your email, you'll go in automatically."}
        </p>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => swap("signin")}
            className="mx-auto mt-3 block text-[11px] font-bold text-white/80"
          >
            ← Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}
