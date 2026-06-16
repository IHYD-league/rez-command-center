import React, { useState } from "react";
import { supabase } from "./lib/supabase.js";

const ASSETS = {
  bg:   "/Sign-in/MFHQ-background-sign-in.png",
  logo: "/Sign-in/my-family-hq-clean-logo.png",
};

export default function Login() {
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
          } catch (_) {}
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

  const submitLabel = busy
    ? (mode === "signin" ? "Signing in…" : mode === "forgot" ? "Sending…" : "Creating account…")
    : (mode === "signin" ? "Sign in" : mode === "newfamily" ? "Create family" : mode === "forgot" ? "Send reset link" : "Request access");

  // Mike's 2026-06-15 directive: logo is INSIDE the card, absolutely
  // positioned, overlapping the card's top edge. The card has
  // padding-top: 140px to make room. The whole sign-in is ONE
  // composition — no separate "hero" or "logo section" above the card.
  const SHELL = {
    minHeight: "100dvh",
    backgroundImage: `url(${ASSETS.bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "120px 24px 24px",
    fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
  };
  const CARD = {
    position: "relative",
    width: "100%",
    maxWidth: "560px",
    borderRadius: "38px",
    background: "rgba(255, 248, 220, 0.96)",
    border: "4px solid #FFD94D",
    boxShadow: "0 18px 40px rgba(75,45,20,0.22)",
    padding: "140px 32px 40px",
  };
  const LOGO = {
    position: "absolute",
    left: "50%",
    top: "-90px",
    transform: "translateX(-50%)",
    width: "min(420px, 72vw)",
    height: "auto",
    zIndex: 20,
    pointerEvents: "none",
    userSelect: "none",
    filter: "drop-shadow(0 10px 18px rgba(75,45,20,0.35))",
  };
  // Spacing rhythm per Mike's spec:
  //   logo bottom → 24px → title
  //   title       → 24px → tabs
  //   tabs        → 24px → email
  //   email       → 24px → password
  //   password    → 8px  → forgot
  //   forgot      → 24px → sign in btn
  //   sign in btn → 24px → helper
  const TITLE = {
    fontSize: "30px",
    lineHeight: 1.05,
    fontWeight: 900,
    color: "#1F5132",
    textAlign: "center",
    margin: "0 0 24px 0",
  };
  const TAB_STRIP = {
    height: "64px",
    borderRadius: "24px",
    border: "3px solid rgba(255,217,77,0.65)",
    background: "rgba(255,246,216,0.72)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.25fr",
    gap: "6px",
    padding: "6px",
    marginBottom: "24px",
  };
  const TAB_BASE = {
    height: "52px",
    borderRadius: "20px",
    fontSize: "18px",
    fontWeight: 900,
    border: "none",
    cursor: "pointer",
    fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
  };
  const TAB_ACTIVE = {
    ...TAB_BASE,
    background: "linear-gradient(#A7E74B, #4DBB4F)",
    color: "white",
    boxShadow: "inset 0 2px 0 rgba(255,255,255,.45), 0 5px 0 #2f8d2f",
  };
  const TAB_INACTIVE = {
    ...TAB_BASE,
    background: "transparent",
    color: "#1F5132",
  };
  const LABEL = {
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "0.12em",
    color: "#1F5132",
    marginBottom: "8px",
    display: "block",
  };
  const INPUT = {
    height: "58px",
    borderRadius: "20px",
    border: "3px solid #FFD94D",
    background: "rgba(255,255,255,0.6)",
    fontSize: "16px",
    padding: "0 18px",
    width: "100%",
    color: "#4B2D14",
    outline: "none",
    fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
    boxSizing: "border-box",
  };
  const INPUT_WITH_LEFT_ICON = { ...INPUT, paddingLeft: "52px" };
  const INPUT_WITH_BOTH_ICONS = { ...INPUT, paddingLeft: "52px", paddingRight: "52px" };
  // Field row wraps a label + input; the next field starts 24px below
  // this one's last element. We achieve that via marginBottom on the
  // input wrapper.
  const FIELD_ROW = { marginBottom: "24px" };
  const INPUT_WRAP = { position: "relative" };
  const ICON_LEFT = {
    position: "absolute",
    left: "18px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "20px",
    opacity: 0.65,
    pointerEvents: "none",
  };
  const ICON_RIGHT = {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "20px",
    opacity: 0.65,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
  };
  // Password row: only 8px gap to the forgot link below.
  const PASSWORD_ROW = { marginBottom: "8px" };
  const FORGOT = {
    fontSize: "15px",
    fontWeight: 900,
    color: "#1F5132",
    textDecoration: "underline",
    display: "block",
    textAlign: "right",
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
    marginBottom: "24px",
    padding: 0,
  };
  const BIG_BTN = {
    width: "100%",
    maxWidth: "480px",
    height: "70px",
    borderRadius: "28px",
    display: "block",
    margin: "0 auto 24px",
    background: "linear-gradient(#B8FF22, #25B934)",
    border: "5px solid #FFD94D",
    boxShadow: "0 7px 0 #704415, 0 14px 24px rgba(75,45,20,.28)",
    fontSize: "24px",
    fontWeight: 900,
    color: "white",
    cursor: "pointer",
    fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
  };
  const HELPER = {
    fontSize: "14px",
    lineHeight: 1.45,
    color: "#1F5132",
    textAlign: "center",
    maxWidth: "480px",
    margin: "0 auto",
  };
  const ALERT = (good) => ({
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "14px",
    padding: "10px 14px",
    marginBottom: "16px",
    background: good ? "#DCFCE7" : "#FEE2E2",
    color: good ? "#15803D" : "#B91C1C",
    border: `1px solid ${good ? "#86EFAC" : "#FCA5A5"}`,
    textAlign: "center",
  });

  return (
    <div style={SHELL}>
      {/* THE CARD — ONE composition. Logo lives inside it, absolutely
          positioned to overlap the top edge. No separate hero / logo
          section above the card. */}
      <form onSubmit={submit} style={CARD}>
        <img
          src={ASSETS.logo}
          alt="My Family HQ"
          style={LOGO}
          draggable={false}
        />

        <h1 style={TITLE}>
          {mode === "forgot" ? "Reset your password" : "Family sign-in"}
        </h1>

        <div style={TAB_STRIP}>
          <button
            type="button"
            onClick={() => swap("signin")}
            tabIndex={-1}
            style={(mode === "signin" || mode === "forgot") ? TAB_ACTIVE : TAB_INACTIVE}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => swap("register")}
            tabIndex={5}
            style={mode === "register" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            Join
          </button>
          <button
            type="button"
            onClick={() => swap("newfamily")}
            tabIndex={6}
            style={mode === "newfamily" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            New family
          </button>
        </div>

        {(mode === "register" || mode === "newfamily") && (
          <div style={FIELD_ROW}>
            <label style={LABEL}>YOUR NAME</label>
            <div style={INPUT_WRAP}>
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                style={INPUT}
              />
            </div>
          </div>
        )}

        {mode === "newfamily" && (
          <div style={FIELD_ROW}>
            <label style={LABEL}>FAMILY NAME (OPTIONAL)</label>
            <div style={INPUT_WRAP}>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Your family name"
                style={INPUT}
              />
            </div>
          </div>
        )}

        <div style={FIELD_ROW}>
          <label style={LABEL}>EMAIL</label>
          <div style={INPUT_WRAP}>
            <span style={ICON_LEFT}>✉️</span>
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
              style={INPUT_WITH_LEFT_ICON}
            />
          </div>
        </div>

        {mode !== "forgot" && (
          <>
            <div style={PASSWORD_ROW}>
              <label style={LABEL}>PASSWORD</label>
              <div style={INPUT_WRAP}>
                <span style={ICON_LEFT}>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={mode !== "signin" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  tabIndex={2}
                  style={INPUT_WITH_BOTH_ICONS}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  style={ICON_RIGHT}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => swap("forgot")}
                tabIndex={4}
                style={FORGOT}
              >
                Forgot password?
              </button>
            )}
          </>
        )}

        {err && <div role="alert"  style={ALERT(false)}>{err}</div>}
        {info && <div role="status" style={ALERT(true)}>{info}</div>}

        <button
          type="submit"
          disabled={busy}
          tabIndex={3}
          style={{ ...BIG_BTN, opacity: busy ? 0.7 : 1 }}
          aria-label={submitLabel}
        >
          {submitLabel}
        </button>

        <p style={HELPER}>
          {mode === "signin" && (
            <>Don't have an account? Tap <strong>Join</strong> (existing family) or <strong>New family</strong> (start your own).</>
          )}
          {mode === "newfamily" && "You'll be the founding parent. You can add your kid's profile next."}
          {mode === "forgot" && "We'll email you a link to reset your password."}
          {mode === "register" && "A parent of an existing family will see your request and approve or deny it. If they pre-staged your email, you'll go in automatically."}
        </p>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => swap("signin")}
            style={{
              ...FORGOT,
              textAlign: "center",
              marginTop: "16px",
              marginBottom: "0",
            }}
          >
            ← Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}
