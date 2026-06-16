import React, { useState } from "react";
import { supabase } from "./lib/supabase.js";

// My Family HQ brand palette — single source of truth used inline so
// future theming can read from this object.
const BRAND = {
  skyBlue:        "#6FD3FF",
  deepBlue:       "#1E7BCF",
  sunshineYellow: "#FFD94D",
  warmOrange:     "#FF9A3C",
  limeGreen:      "#A7E74B",
  forestGreen:    "#4DBB4F",
  chocolateBrown: "#7A4A22",
  darkCocoa:      "#4B2D14",
  creamWhite:     "#FFF6D8",
  softPink:       "#FF7FAE",
};

// Asset paths under public/. Vite serves /public/* at the site root,
// so `/Sign-in/foo.png` resolves to the file at public/Sign-in/foo.png.
const ASSETS = {
  bg:              "/Sign-in/MFHQ-background-sign-in.png",
  logo:            "/Sign-in/my-family-hq-clean-logo.png",
  signInActive:    "/Sign-in/sign-in-button.png",
  signInInactive:  "/Sign-in/sign-in-button-notactive.png",
  joinActive:      "/Sign-in/join-button.png",
  newFamilyActive: "/Sign-in/new-family-button.png",
};

export default function Login() {
  // Four branches:
  //   signin     — existing account signing back in
  //   register   — joining an existing family
  //   newfamily  — starting a brand-new family
  //   forgot     — request a password-reset email
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      if (!data?.session) {
        if (mode === "newfamily") {
          try {
            window.localStorage.setItem("lyf_new_family_intent", JSON.stringify({
              parentName: name.trim(),
              familyName: familyName.trim() || null,
            }));
          } catch (_) { /* private mode — they'll re-enter on sign-in */ }
          setInfo("Account created. Check your email to confirm, then sign in and your family will be set up.");
        } else {
          setInfo("Account created. Check your email to confirm, then sign in. A parent will need to approve you before you can use the app.");
        }
        setMode("signin");
        return;
      }

      if (mode === "newfamily") {
        const { error: rpcErr } = await supabase.rpc("create_family", {
          p_parent_name: name.trim(),
          p_family_name: familyName.trim() || null,
        });
        if (rpcErr) { setErr(rpcErr.message); return; }
      } else {
        await supabase.rpc("request_to_join", { p_display_name: name.trim() || null });
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

  // Mode-aware CTA: the big button reflects the current mode's action,
  // so the image asset always matches. forgot mode falls back to the
  // sign-in image (sending the reset link is technically a sign-in
  // path).
  const ctaAsset = mode === "register"
    ? ASSETS.joinActive
    : mode === "newfamily"
      ? ASSETS.newFamilyActive
      : ASSETS.signInActive;

  const submitLabel = busy
    ? (mode === "signin" ? "Signing in…" : mode === "forgot" ? "Sending…" : "Creating account…")
    : (mode === "signin" ? "Sign in" : mode === "newfamily" ? "Create family" : mode === "forgot" ? "Send reset link" : "Request access");

  // Shared input styling — solid cream/white with sunshine-yellow
  // border. py-3.5 gives ~52px height, well above the 44px iOS tap
  // target floor.
  const inputBaseStyle = {
    background: "#FFFCE8",
    border: `2px solid ${BRAND.sunshineYellow}`,
    color: BRAND.darkCocoa,
  };
  const inputClass = "w-full rounded-2xl pl-12 pr-3 py-3.5 text-base font-semibold placeholder:text-amber-700/40 focus:outline-none focus:ring-2 focus:ring-amber-300";

  // Tab cell — fills 1/3 of the strip, h-full, image rendered with
  // h-full + w-auto + object-contain so the visible pill scales up
  // and the image's internal padding becomes the visual breathing
  // room around the pill (rather than shrinking the pill itself).
  // Active assets are clickable; inactive renders forest-green text.
  // Inactive Sign-in tab specifically gets the sign-in-button-notactive
  // image per Mike's direction.
  const Tab = ({ value, label, activeAsset, tabIndex }) => {
    const isActive = mode === value || (value === "signin" && mode === "forgot");
    return (
      <button
        type="button"
        onClick={() => swap(value)}
        tabIndex={tabIndex}
        className="flex-1 h-full flex items-center justify-center rounded-2xl active:scale-95 transition px-1"
        aria-pressed={isActive}
      >
        {isActive ? (
          <img
            src={activeAsset}
            alt={label}
            className="h-full w-auto max-w-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        ) : value === "signin" ? (
          <img
            src={ASSETS.signInInactive}
            alt={label}
            className="h-full w-auto max-w-full object-contain opacity-80 pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <span
            className="text-base font-extrabold"
            style={{ color: BRAND.forestGreen, fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' }}
          >
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="min-h-screen w-full flex items-start justify-center px-3 pt-6 pb-8"
      style={{
        backgroundImage: `url(${ASSETS.bg}), linear-gradient(180deg, ${BRAND.skyBlue} 0%, ${BRAND.limeGreen} 100%)`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
      }}
    >
      <div className="w-full max-w-md flex flex-col items-stretch">
        {/* Logo sits visually ON TOP of the cream card per the mockup.
            Negative margin pulls the form up so the bottom third of
            the logo overlaps the card top edge; the form's matching
            top padding makes room so content doesn't crowd under it. */}
        <img
          src={ASSETS.logo}
          alt="My Family HQ"
          className="w-[80%] max-w-[360px] mx-auto -mb-10 relative z-10 drop-shadow-2xl pointer-events-none select-none"
          draggable={false}
        />

        <form
          onSubmit={submit}
          className="w-full rounded-[32px] pt-20 pb-6 px-5"
          style={{
            background: BRAND.creamWhite,
            border: `3px solid ${BRAND.sunshineYellow}`,
            boxShadow:
              "0 18px 36px -12px rgba(122, 74, 34, 0.35), 0 0 36px rgba(255, 217, 77, 0.45)",
          }}
        >
          <h1
            className="text-center text-2xl font-extrabold mb-4"
            style={{ color: BRAND.darkCocoa }}
          >
            {mode === "forgot" ? "Reset your password" : "Family sign-in"}
          </h1>

          {/* Tab strip — h-16 so the active button image renders large
              enough to look like the polished game-button it is. Each
              cell is flex-1, image fills the cell with object-contain. */}
          <div
            className="flex items-center gap-1 mb-5 rounded-2xl px-2 py-1 h-16"
            style={{ background: "rgba(255, 217, 77, 0.18)", border: `2px solid rgba(255, 217, 77, 0.45)` }}
          >
            <Tab value="signin"    label="Sign in"    activeAsset={ASSETS.signInActive}    tabIndex={-1} />
            <Tab value="register"  label="Join"       activeAsset={ASSETS.joinActive}      tabIndex={5} />
            <Tab value="newfamily" label="New family" activeAsset={ASSETS.newFamilyActive} tabIndex={6} />
          </div>

          {/* Name + family-name fields (join / new-family flows only) */}
          {(mode === "register" || mode === "newfamily") && (
            <>
              <label className="block text-[11px] uppercase tracking-wider font-extrabold mb-1.5" style={{ color: BRAND.forestGreen }}>
                Your name
              </label>
              <div className="relative w-full mb-4">
                <input
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name"
                  className={inputClass.replace("pl-12", "pl-4")}
                  style={inputBaseStyle}
                />
              </div>
            </>
          )}

          {mode === "newfamily" && (
            <>
              <label className="block text-[11px] uppercase tracking-wider font-extrabold mb-1.5" style={{ color: BRAND.forestGreen }}>
                Family name <span style={{ color: BRAND.chocolateBrown, opacity: 0.7 }}>(optional)</span>
              </label>
              <div className="relative w-full mb-4">
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Your family name"
                  className={inputClass.replace("pl-12", "pl-4")}
                  style={inputBaseStyle}
                />
              </div>
            </>
          )}

          {/* Email */}
          <label className="block text-[11px] uppercase tracking-wider font-extrabold mb-1.5" style={{ color: BRAND.forestGreen }}>
            Email
          </label>
          <div className="relative w-full mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl" style={{ color: BRAND.chocolateBrown, opacity: 0.6 }}>✉️</span>
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              tabIndex={1}
              className={inputClass}
              style={inputBaseStyle}
            />
          </div>

          {/* Password */}
          {mode !== "forgot" && (
            <>
              <label className="block text-[11px] uppercase tracking-wider font-extrabold mb-1.5" style={{ color: BRAND.forestGreen }}>
                Password
              </label>
              <div className="relative w-full mb-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl" style={{ color: BRAND.chocolateBrown, opacity: 0.6 }}>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={mode !== "signin" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  tabIndex={2}
                  className={`${inputClass} pr-12`}
                  style={inputBaseStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <span className="text-xl" style={{ color: BRAND.chocolateBrown, opacity: 0.6 }}>{showPassword ? "🙈" : "👁️"}</span>
                </button>
              </div>

              {/* Forgot password — right-aligned, beneath the password
                  input. tabIndex 4 so keyboard order is email → password
                  → sign-in → forgot. */}
              {mode === "signin" && (
                <div className="flex justify-end mt-1 mb-3">
                  <button
                    type="button"
                    onClick={() => swap("forgot")}
                    tabIndex={4}
                    className="text-sm font-extrabold underline underline-offset-2"
                    style={{ color: BRAND.forestGreen }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          )}

          {err && (
            <div
              className="text-sm font-semibold rounded-xl px-3 py-2 mb-3"
              role="alert"
              style={{ background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" }}
            >
              {err}
            </div>
          )}
          {info && (
            <div
              className="text-sm font-semibold rounded-xl px-3 py-2 mb-3"
              role="status"
              style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC" }}
            >
              {info}
            </div>
          )}

          {/* Big CTA — full-width inside the card. Image is w-full so
              it scales to the available width; the asset's internal
              padding becomes the visual breathing around the pill. */}
          <button
            type="submit"
            disabled={busy}
            tabIndex={3}
            className="w-full mt-2 active:scale-[0.98] transition disabled:opacity-70"
            aria-label={submitLabel}
          >
            <img
              src={busy ? ASSETS.signInInactive : ctaAsset}
              alt={submitLabel}
              className="w-full h-auto pointer-events-none select-none"
              draggable={false}
            />
          </button>

          {busy && (
            <div className="text-center text-sm font-bold mt-1" style={{ color: BRAND.forestGreen }}>
              {submitLabel}
            </div>
          )}

          <p
            className="text-center text-[12px] mt-5 leading-snug"
            style={{ color: BRAND.darkCocoa }}
          >
            {mode === "signin" && (
              <>Don't have an account? Tap <strong style={{ color: BRAND.forestGreen }}>Join</strong> (existing family) or <strong style={{ color: BRAND.forestGreen }}>New family</strong> (start your own).</>
            )}
            {mode === "newfamily" && "You'll be the founding parent. You can add your kid's profile next."}
            {mode === "forgot" && "We'll email you a link to reset your password."}
            {mode === "register" && "A parent of an existing family will see your request and approve or deny it. If they pre-staged your email, you'll go in automatically."}
          </p>

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => swap("signin")}
              className="mx-auto mt-3 block text-sm font-extrabold underline underline-offset-2"
              style={{ color: BRAND.forestGreen }}
            >
              ← Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
