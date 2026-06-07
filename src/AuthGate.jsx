import React, { useEffect, useState } from "react";
import { supabase, hasSupabaseConfig } from "./lib/supabase.js";
import Login from "./Login.jsx";

export default function AuthGate({ children }) {
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setStatus("config");
      return;
    }
    let unsub;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setStatus(s ? "in" : "out");
    });
    unsub = () => sub.subscription.unsubscribe();
    return () => unsub && unsub();
  }, []);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#94a3b8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }

  if (status === "config") {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>App not configured</h1>
        <p style={{ marginBottom: 8 }}>
          Set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> (local) or
          Netlify env vars (deploy), then reload.
        </p>
      </div>
    );
  }

  if (status === "out") return <Login />;

  // Sign out lives INSIDE the app's TopBar now, not as a floating overlay
  // (the old fixed pill collided with the Switch button on narrow phones).
  // We expose signOut + sessionEmail through the render-prop child so the
  // TopBar can render its own button in the natural flexbox of the header.
  const signOut = () => supabase.auth.signOut();
  const sessionEmail = session?.user?.email || "";
  const renderChildren =
    typeof children === "function"
      ? children({ session, signOut, sessionEmail })
      : children;
  return <>{renderChildren}</>;
}
