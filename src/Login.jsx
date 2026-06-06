import React, { useState } from "react";
import { supabase } from "./lib/supabase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setErr(error.message);
  };

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
          Reznor Command Center
        </h1>
        <p className="text-white/70 text-sm text-center mb-6">Family sign-in</p>

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

        <label className="block text-[11px] uppercase tracking-wide text-white/60 mb-1">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl bg-white/15 border border-white/15 px-3 py-2 mb-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
        />

        {err && (
          <div className="text-amber-200 text-sm mb-3" role="alert">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-white text-indigo-700 font-bold py-2 active:scale-95 transition disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-white/40 text-[11px] mt-6">
          Accounts are created by the family admin. No public signup.
        </p>
      </form>
    </div>
  );
}
