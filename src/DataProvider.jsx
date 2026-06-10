import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { toApp, toDb } from "./data/transform.js";

// One DataProvider load:
//   - reads who I am (auth) → my profile → my family_id
//   - loads every entity for that family in parallel
//   - hands the app `initial`, `currentUserId`, and a `sync(key, value)`
//     function that replaces the entity's rows in Supabase when the app
//     setState's it.
// Sync semantics: "replace the whole array for this entity in my family".
// Inefficient at scale, fine for a family of four. Each sync is debounced.

const ENTITIES = {
  profiles:        { table: "profiles",        toApp: toApp.profile,        toDb: toDb.profile,        key: "id"   },
  tasks:           { table: "tasks",           toApp: toApp.task,           toDb: toDb.task,           key: "id"   },
  rewards:         { table: "rewards",         toApp: toApp.reward,         toDb: toDb.reward,         key: "id"   },
  completions:     { table: "completions",     toApp: toApp.completion,     toDb: toDb.completion,     key: "id"   },
  books:           { table: "books",           toApp: toApp.book,           toDb: toDb.book,           key: "id"   },
  awards:          { table: "awards",          toApp: toApp.award,          toDb: toDb.award,          key: "id"   },
  rewardRequests:  { table: "reward_requests", toApp: toApp.rewardRequest,  toDb: toDb.rewardRequest,  key: "id"   },
  redemptions:     { table: "redemptions",     toApp: toApp.redemption,     toDb: toDb.redemption,     key: "id"   },
  gifted:          { table: "gifted_stars",    toApp: toApp.gifted,         toDb: toDb.gifted,         key: "id"   },
  songs:           { table: "songs",            toApp: toApp.song,           toDb: toDb.song,           key: "id"   },
  songPlays:       { table: "song_plays",       toApp: toApp.songPlay,       toDb: toDb.songPlay,       key: "id"   },
  events:          { table: "events",           toApp: toApp.event,          toDb: toDb.event,          key: "id"   },
  handoffNotes:    { table: "handoff_notes",    toApp: toApp.handoffNote,    toDb: toDb.handoffNote,    key: "id"   },
  albumPhotos:     { table: "album_photos",     toApp: toApp.albumPhoto,     toDb: toDb.albumPhoto,     key: "id"   },
};

async function loadFamilyId() {
  const { data, error } = await supabase
    .from("profiles")
    .select("family_id")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.family_id ?? null;
}

async function loadEntities(familyId) {
  const reads = await Promise.all(
    Object.entries(ENTITIES).map(async ([name, def]) => {
      const { data, error } = await supabase
        .from(def.table)
        .select("*")
        .eq("family_id", familyId);
      if (error) throw new Error(`${def.table}: ${error.message}`);
      return [name, (data || []).map(def.toApp)];
    })
  );
  const out = Object.fromEntries(reads);
  // Streaks are keyed by activity_id, separate query/shape.
  const { data: streaks, error: streaksErr } = await supabase
    .from("streaks")
    .select("*")
    .eq("family_id", familyId);
  if (streaksErr) throw new Error(`streaks: ${streaksErr.message}`);
  out.streaks = Object.fromEntries((streaks || []).map(toApp.streakRow));
  // Board state keyed by profile_id, same shape as streaks.
  const { data: bs, error: bsErr } = await supabase
    .from("board_state")
    .select("*")
    .eq("family_id", familyId);
  if (bsErr) throw new Error(`board_state: ${bsErr.message}`);
  out.boardState = Object.fromEntries((bs || []).map(toApp.boardStateRow));
  // User prefs keyed by profile_id — Customization Hub data.
  const { data: up, error: upErr } = await supabase
    .from("user_prefs")
    .select("*")
    .eq("family_id", familyId);
  if (upErr) throw new Error(`user_prefs: ${upErr.message}`);
  out.userPrefs = Object.fromEntries((up || []).map(toApp.userPrefsRow));
  // family_settings — one row per family. Use maybeSingle so it's
  // fine for fresh installs where no row exists yet.
  const { data: fs, error: fsErr } = await supabase
    .from("family_settings")
    .select("settings")
    .eq("family_id", familyId)
    .maybeSingle();
  if (fsErr) throw new Error(`family_settings: ${fsErr.message}`);
  out.familySettings = fs?.settings ?? {};
  // summer_quest_progress keyed by profile_id — Summer Quest v1 arm.
  // Same composite-key + family-scope shape as board_state / user_prefs.
  const { data: sq, error: sqErr } = await supabase
    .from("summer_quest_progress")
    .select("*")
    .eq("family_id", familyId);
  if (sqErr) throw new Error(`summer_quest_progress: ${sqErr.message}`);
  out.summerQuest = Object.fromEntries((sq || []).map(toApp.summerQuestRow));
  // pending_registrations — only readable by parents (RLS). Non-parents
  // get an empty array; that's fine.
  const { data: pr } = await supabase
    .from("pending_registrations")
    .select("auth_user_id, email, display_name, requested_at")
    .eq("family_id", familyId);
  out.pendingRegistrations = (pr || []).map((r) => ({
    authUserId: r.auth_user_id,
    email: r.email,
    displayName: r.display_name,
    requestedAt: r.requested_at,
  }));
  return out;
}

export default function DataProvider({ session, children, signOut, sessionEmail }) {
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const debounceRefs = useRef({});
  // Sync-error surfacing — when a sync upsert / delete fails, push the
  // detail here so a red banner appears at the top of the app. Without
  // this every failure was a silent console.error, invisible to the
  // user and the cause of the "writes vanish on refresh" mystery.
  const [syncErrors, setSyncErrors] = useState([]);
  const pushSyncError = (table, op, msg) => {
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setSyncErrors((prev) => [{ id: Date.now() + Math.random(), table, op, msg, stamp }, ...prev].slice(0, 5));
  };
  const dismissSyncErrors = () => setSyncErrors([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Auto-link: if a parent typed this user's email into a profile
        // before they signed in, claim_profile_by_email() stamps
        // auth_user_id now so my_family_id()/RLS resolves below.
        // Errors here are non-fatal — fall through to the normal lookup.
        try { await supabase.rpc("claim_profile_by_email"); } catch (_) {}

        // Self-registered users land here with no profile yet. If a
        // pending_registrations row exists for them, the next call
        // returns it (RLS lets them see their own row); otherwise this
        // is a fresh signup we haven't queued yet — try to enqueue.
        try {
          const { data: pendingMine } = await supabase
            .from("pending_registrations")
            .select("auth_user_id")
            .maybeSingle();
          if (!pendingMine) {
            // Idempotent: no-op if a profile already exists.
            await supabase.rpc("request_to_join", { p_display_name: null });
          }
        } catch (_) {}

        const fid = await loadFamilyId();
        if (cancelled) return;
        if (!fid) {
          // No profile. Distinguish "queued for approval" from
          // "really nothing seeded yet".
          const { data: pendingMine } = await supabase
            .from("pending_registrations")
            .select("auth_user_id")
            .maybeSingle();
          if (cancelled) return;
          setStatus(pendingMine ? "pending_approval" : "no_family");
          return;
        }
        setFamilyId(fid);
        const loaded = await loadEntities(fid);
        if (cancelled) return;

        const myEmail = (session?.user?.email || "").toLowerCase();
        const myProfile = (loaded.profiles || []).find(
          (p) => (p.email || "").toLowerCase() === myEmail
        );

        // Enforce timed access on the way in. A sitter whose window has
        // passed gets stuck on the access_expired screen with a Sign
        // out button; the app never renders for them. Parents and the
        // kid profile are never gated.
        if (
          myProfile &&
          myProfile.role !== "parent" &&
          myProfile.role !== "kid" &&
          (myProfile.active === false ||
            (myProfile.accessType === "temporary" &&
              myProfile.accessExpires &&
              new Date(myProfile.accessExpires + "T23:59:59") < new Date()))
        ) {
          setStatus("access_expired");
          return;
        }

        setCurrentProfileId(myProfile?.id ?? null);

        setData(loaded);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || String(e));
          setStatus("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Whole-array replace for one entity. Debounced 400ms so a burst of
  // setX calls within a render coalesces into one network round trip.
  const sync = (key, value) => {
    if (!familyId) return;
    const composite = key === "streaks" || key === "boardState" || key === "userPrefs" || key === "familySettings" || key === "summerQuest";
    const def = composite ? null : ENTITIES[key];
    if (!def && !composite) {
      console.warn("sync: unknown entity", key);
      return;
    }
    clearTimeout(debounceRefs.current[key]);
    debounceRefs.current[key] = setTimeout(async () => {
      try {
        if (key === "boardState") {
          // board_state: upsert per profile_id, no destructive delete
          const rows = Object.entries(value || {}).map(([pid, s]) =>
            toDb.boardStateRow(familyId)(pid, s)
          );
          if (rows.length === 0) return;
          const { error } = await supabase
            .from("board_state")
            .upsert(rows, { onConflict: "family_id,profile_id" });
          if (error) { console.error("board_state sync:", error.message); pushSyncError("board_state", "upsert", error.message); }
          return;
        }
        if (key === "userPrefs") {
          // user_prefs: upsert per profile_id, same composite-key pattern
          const rows = Object.entries(value || {}).map(([pid, s]) =>
            toDb.userPrefsRow(familyId)(pid, s)
          );
          if (rows.length === 0) return;
          const { error } = await supabase
            .from("user_prefs")
            .upsert(rows, { onConflict: "family_id,profile_id" });
          if (error) { console.error("user_prefs sync:", error.message); pushSyncError("user_prefs", "upsert", error.message); }
          return;
        }
        if (key === "summerQuest") {
          // summer_quest_progress: upsert per profile_id, same
          // composite-key pattern as boardState / userPrefs.
          const rows = Object.entries(value || {}).map(([pid, s]) =>
            toDb.summerQuestRow(familyId)(pid, s)
          );
          if (rows.length === 0) return;
          const { error } = await supabase
            .from("summer_quest_progress")
            .upsert(rows, { onConflict: "family_id,profile_id" });
          if (error) { console.error("summer_quest_progress sync:", error.message); pushSyncError("summer_quest_progress", "upsert", error.message); }
          return;
        }
        if (key === "familySettings") {
          // family_settings: one-row-per-family singleton. The value is
          // the whole jsonb settings blob.
          const { error } = await supabase
            .from("family_settings")
            .upsert(
              { family_id: familyId, settings: value || {} },
              { onConflict: "family_id" }
            );
          if (error) { console.error("family_settings sync:", error.message); pushSyncError("family_settings", "upsert", error.message); }
          return;
        }
        if (key === "streaks") {
          // streaks: upsert each activity_id, no destructive delete
          const rows = Object.entries(value || {}).map(([aid, s]) =>
            toDb.streakRow(familyId)(aid, s)
          );
          if (rows.length === 0) return;
          const { error } = await supabase
            .from("streaks")
            .upsert(rows, { onConflict: "family_id,activity_id" });
          if (error) { console.error("streaks sync:", error.message); pushSyncError("streaks", "upsert", error.message); }
          return;
        }
        const rows = (value || []).map(def.toDb(familyId));
        const keepIds = rows.map((r) => r[def.key]);

        // Delete rows no longer present, then upsert the current set.
        const del = supabase
          .from(def.table)
          .delete()
          .eq("family_id", familyId);
        const delQ = keepIds.length
          ? del.not(def.key, "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`)
          : del;
        const { error: dErr } = await delQ;
        if (dErr) { console.error(`${def.table} delete:`, dErr.message); pushSyncError(def.table, "delete", dErr.message); }

        if (rows.length) {
          const { error: uErr } = await supabase
            .from(def.table)
            .upsert(rows, { onConflict: def.key });
          if (uErr) { console.error(`${def.table} upsert:`, uErr.message); pushSyncError(def.table, "upsert", uErr.message); }
        }
      } catch (e) {
        const msg = e.message || String(e);
        console.error(`sync ${key}:`, msg);
        pushSyncError(key, "sync", msg);
      }
    }, 400);
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>
        Loading family data…
      </div>
    );
  }
  if (status === "access_expired") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Access ended</h1>
        <p style={{ marginBottom: 8 }}>
          Your access window has passed{sessionEmail ? <> for <strong>{sessionEmail}</strong></> : ""}.
          A parent can extend it from the People page.
        </p>
        {signOut && (
          <button
            onClick={signOut}
            style={{
              marginTop: 12, padding: "8px 14px", borderRadius: 8,
              background: "#0f172a", color: "white", border: "none",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Sign out
          </button>
        )}
      </div>
    );
  }
  if (status === "pending_approval") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Waiting for parent approval</h1>
        <p style={{ marginBottom: 8 }}>
          {sessionEmail ? <>You signed up as <strong>{sessionEmail}</strong>. </> : ""}
          A parent will see your request and approve it from inside the app.
          Once they do, just refresh this page.
        </p>
        {signOut && (
          <button
            onClick={signOut}
            style={{
              marginTop: 12, padding: "8px 14px", borderRadius: 8,
              background: "#0f172a", color: "white", border: "none",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Sign out
          </button>
        )}
      </div>
    );
  }
  if (status === "no_family") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>No family yet</h1>
        <p style={{ marginBottom: 8 }}>
          {sessionEmail ? <>Signed in as <strong>{sessionEmail}</strong>. This account </> : "Your account "}
          isn't linked to a family. Run the Phase 2 SQL script
          (<code>supabase/schema.sql</code>) in the Supabase SQL Editor — it
          creates the Lynch family and links you by email.
        </p>
        {signOut && (
          <button
            onClick={signOut}
            style={{
              marginTop: 12, padding: "8px 14px", borderRadius: 8,
              background: "#0f172a", color: "white", border: "none",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Sign out
          </button>
        )}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Couldn't load data</h1>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8 }}>{err}</pre>
        {signOut && (
          <button
            onClick={signOut}
            style={{
              marginTop: 12, padding: "8px 14px", borderRadius: 8,
              background: "#0f172a", color: "white", border: "none",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {syncErrors.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            zIndex: 9999,
            background: "#dc2626",
            color: "#fff",
            padding: "10px 14px",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
            lineHeight: 1.4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
            <div style={{ fontWeight: 800 }}>⚠️ Sync failed ({syncErrors.length}) — writes are NOT reaching the server</div>
            <button
              onClick={dismissSyncErrors}
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
            >
              Dismiss
            </button>
          </div>
          {syncErrors.map((e) => (
            <div key={e.id} style={{ fontSize: 12, opacity: 0.95, marginBottom: 2 }}>
              <span style={{ opacity: 0.7 }}>[{e.stamp}]</span>{" "}
              <strong>{e.table}</strong> {e.op}: {e.msg}
            </div>
          ))}
        </div>
      )}
      {children({ initial: data, currentProfileId, sync, familyId })}
    </>
  );
}
