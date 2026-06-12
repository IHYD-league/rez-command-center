import React, { useState } from "react";
import { supabase } from "./lib/supabase.js";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "register"
  const [name, setName] = useState("");
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
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) { setErr(error.message); return; }
        // If email confirmation is on, there's no session yet — the user
        // has to confirm before signing in. Queue intent now anyway: when
        // they confirm + first load, the queue row will exist.
        if (data?.session) {
          // Authenticated → enqueue immediately.
          await supabase.rpc("request_to_join", { p_display_name: name.trim() || null });
          // AuthGate will swap to the app, DataProvider will land on
          // "pending_approval" until a parent approves.
        } else {
          setInfo("Account created. Check your email to confirm, then sign in. A parent will need to approve you before you can use the app.");
          setMode("signin");
        }
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
        <p className="text-white/70 text-sm text-center mb-5">
          {mode === "signin" ? "Family sign-in" : "Request access"}
        </p>

        <div className="flex bg-white/10 rounded-2xl p-1 mb-5">
          <button
            type="button"
            onClick={() => swap("signin")}
            className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition ${mode === "signin" ? "bg-white text-indigo-700" : "text-white/70"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => swap("register")}
            className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition ${mode === "register" ? "bg-white text-indigo-700" : "text-white/70"}`}
          >
            Register
          </button>
        </div>

        {mode === "register" && (
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
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl bg-white/15 border border-white/15 px-3 py-2 mb-4 text-white placeholder-white/40 focus:outline-none focus:bg-white/20"
        />

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
          {busy
            ? mode === "signin" ? "Signing in…" : "Creating account…"
            : mode === "signin" ? "Sign in" : "Request access"}
        </button>

        <p className="text-center text-white/40 text-[11px] mt-6">
          {mode === "signin"
            ? "Don't have an account? Tap Register — a parent will approve you."
            : "A parent will see your request and approve or deny it before you can use the app."}
        </p>
      </form>
    </div>
  );
}
