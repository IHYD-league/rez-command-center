import React, { useState } from "react";
import { supabase } from "./lib/supabase.js";

const ASSETS = {
  bg:   "/Sign-in/MFHQ-background-sign-in.png",
  logo: "/Sign-in/my-family-hq-clean-logo.png",
};

// Embedded stylesheet — every dimension copied verbatim from Mike's
// 2026-06-15 mobile + desktop spec. Using a real <style> block (not
// inline style objects) so media queries actually work.
const STYLES = `
.loginPage {
  min-height: 100dvh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 290px 22px 28px;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
}

.loginCard {
  position: relative;
  width: 100%;
  max-width: 720px;
  border-radius: 38px;
  border: 4px solid #FFD94D;
  background: rgba(255, 248, 220, 0.96);
  padding: 60px 28px 38px;
  box-shadow: 0 18px 40px rgba(75, 45, 20, 0.22);
  box-sizing: border-box;
}

.loginLogo {
  position: absolute;
  left: 50%;
  top: -270px;
  transform: translateX(-50%);
  width: min(540px, 84vw);
  height: auto;
  z-index: 5;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 10px 18px rgba(75, 45, 20, 0.35));
}

.loginTitle {
  margin: 0 0 28px;
  text-align: center;
  font-size: 34px;
  line-height: 1;
  font-weight: 900;
  color: #1F5132;
}

.loginTabs {
  height: 68px;
  display: grid;
  grid-template-columns: 1fr 1fr 1.35fr;
  gap: 8px;
  padding: 8px;
  margin-bottom: 32px;
  border: 3px solid rgba(255, 217, 77, 0.7);
  border-radius: 28px;
  background: rgba(255, 246, 216, 0.72);
  box-sizing: border-box;
}

.tab {
  white-space: nowrap;
  font-size: clamp(18px, 4.6vw, 24px);
  font-weight: 900;
  border: none;
  border-radius: 22px;
  cursor: pointer;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.tabActive {
  background: linear-gradient(#A7E74B, #4DBB4F);
  color: white;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45), 0 5px 0 #2f8d2f;
}

.tabInactive {
  background: transparent;
  color: #1F5132;
}

.fieldLabel {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #1F5132;
  margin-bottom: 8px;
  display: block;
}

.fieldRow {
  margin-bottom: 24px;
}

.inputWrap {
  position: relative;
}

.input {
  height: 58px;
  border-radius: 20px;
  border: 3px solid #FFD94D;
  background: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  padding: 0 18px;
  width: 100%;
  color: #4B2D14;
  outline: none;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  box-sizing: border-box;
}

.inputWithLeftIcon { padding-left: 52px; }
.inputWithBothIcons { padding-left: 52px; padding-right: 52px; }

.iconLeft {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  opacity: 0.65;
  pointer-events: none;
}

.iconRight {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  opacity: 0.65;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.passwordRow {
  margin-bottom: 8px;
}

.forgot {
  font-size: 15px;
  font-weight: 900;
  color: #1F5132;
  text-decoration: underline;
  display: block;
  text-align: right;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  margin-bottom: 24px;
  padding: 0;
}

.bigBtn {
  width: 100%;
  max-width: 480px;
  height: 70px;
  border-radius: 28px;
  display: block;
  margin: 0 auto 24px;
  background: linear-gradient(#B8FF22, #25B934);
  border: 5px solid #FFD94D;
  box-shadow: 0 7px 0 #704415, 0 14px 24px rgba(75, 45, 20, 0.28);
  font-size: 24px;
  font-weight: 900;
  color: white;
  cursor: pointer;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
}

.helper {
  font-size: 14px;
  line-height: 1.45;
  color: #1F5132;
  text-align: center;
  max-width: 480px;
  margin: 0 auto;
}

.alert {
  font-size: 14px;
  font-weight: 600;
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 16px;
  text-align: center;
}

.alertErr {
  background: #FEE2E2;
  color: #B91C1C;
  border: 1px solid #FCA5A5;
}

.alertOk {
  background: #DCFCE7;
  color: #15803D;
  border: 1px solid #86EFAC;
}

.backLink {
  display: block;
  background: none;
  border: none;
  text-align: center;
  font-size: 15px;
  font-weight: 900;
  color: #1F5132;
  text-decoration: underline;
  cursor: pointer;
  margin: 16px auto 0;
  width: 100%;
  font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
}

@media (min-width: 900px) {
  .loginPage {
    padding-top: 360px;
  }
  .loginCard {
    max-width: 720px;
    padding: 70px 42px 42px;
  }
  .loginLogo {
    top: -330px;
    width: 480px;
  }
  .loginTitle {
    font-size: 34px;
    margin-bottom: 26px;
  }
  .tab {
    font-size: 22px;
  }
}
`;

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

  const tabClass = (active) => "tab " + (active ? "tabActive" : "tabInactive");

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="loginPage"
        style={{ backgroundImage: `url(${ASSETS.bg})` }}
      >
        <form className="loginCard" onSubmit={submit}>
          <img
            className="loginLogo"
            src={ASSETS.logo}
            alt="My Family HQ"
            draggable={false}
          />

          <h1 className="loginTitle">
            {mode === "forgot" ? "Reset your password" : "Family sign-in"}
          </h1>

          <div className="loginTabs">
            <button
              type="button"
              onClick={() => swap("signin")}
              tabIndex={-1}
              className={tabClass(mode === "signin" || mode === "forgot")}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => swap("register")}
              tabIndex={5}
              className={tabClass(mode === "register")}
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => swap("newfamily")}
              tabIndex={6}
              className={tabClass(mode === "newfamily")}
            >
              New family
            </button>
          </div>

          {(mode === "register" || mode === "newfamily") && (
            <div className="fieldRow">
              <label className="fieldLabel">YOUR NAME</label>
              <div className="inputWrap">
                <input
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name"
                  className="input"
                />
              </div>
            </div>
          )}

          {mode === "newfamily" && (
            <div className="fieldRow">
              <label className="fieldLabel">FAMILY NAME (OPTIONAL)</label>
              <div className="inputWrap">
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Your family name"
                  className="input"
                />
              </div>
            </div>
          )}

          <div className="fieldRow">
            <label className="fieldLabel">EMAIL</label>
            <div className="inputWrap">
              <span className="iconLeft">✉️</span>
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
                className="input inputWithLeftIcon"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <>
              <div className="passwordRow">
                <label className="fieldLabel">PASSWORD</label>
                <div className="inputWrap">
                  <span className="iconLeft">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={mode !== "signin" ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    tabIndex={2}
                    className="input inputWithBothIcons"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                    className="iconRight"
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
                  className="forgot"
                >
                  Forgot password?
                </button>
              )}
            </>
          )}

          {err && <div role="alert"  className="alert alertErr">{err}</div>}
          {info && <div role="status" className="alert alertOk">{info}</div>}

          <button
            type="submit"
            disabled={busy}
            tabIndex={3}
            className="bigBtn"
            style={busy ? { opacity: 0.7 } : undefined}
            aria-label={submitLabel}
          >
            {submitLabel}
          </button>

          <p className="helper">
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
              className="backLink"
            >
              ← Back to sign in
            </button>
          )}
        </form>
      </div>
    </>
  );
}
