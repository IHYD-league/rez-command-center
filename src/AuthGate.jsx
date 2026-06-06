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

  return (
    <>
      {children}
      <button
        onClick={() => supabase.auth.signOut()}
        title={session?.user?.email || "Sign out"}
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          zIndex: 50,
          background: "rgba(15,23,42,0.85)",
          color: "white",
          padding: "6px 12px",
          borderRadius: 999,
          border: 0,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        Sign out
      </button>
    </>
  );
}
