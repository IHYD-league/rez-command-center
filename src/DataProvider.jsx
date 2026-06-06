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
  return out;
}

export default function DataProvider({ session, children }) {
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const debounceRefs = useRef({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fid = await loadFamilyId();
        if (cancelled) return;
        if (!fid) {
          setStatus("no_family");
          return;
        }
        setFamilyId(fid);
        const loaded = await loadEntities(fid);
        if (cancelled) return;

        const myEmail = (session?.user?.email || "").toLowerCase();
        const myProfile = (loaded.profiles || []).find(
          (p) => (p.email || "").toLowerCase() === myEmail
        );
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
    const def = key === "streaks" ? null : ENTITIES[key];
    if (!def && key !== "streaks") {
      console.warn("sync: unknown entity", key);
      return;
    }
    clearTimeout(debounceRefs.current[key]);
    debounceRefs.current[key] = setTimeout(async () => {
      try {
        if (key === "streaks") {
          // streaks: upsert each activity_id, no destructive delete
          const rows = Object.entries(value || {}).map(([aid, s]) =>
            toDb.streakRow(familyId)(aid, s)
          );
          if (rows.length === 0) return;
          const { error } = await supabase
            .from("streaks")
            .upsert(rows, { onConflict: "family_id,activity_id" });
          if (error) console.error("streaks sync:", error.message);
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
        if (dErr) console.error(`${def.table} delete:`, dErr.message);

        if (rows.length) {
          const { error: uErr } = await supabase
            .from(def.table)
            .upsert(rows, { onConflict: def.key });
          if (uErr) console.error(`${def.table} upsert:`, uErr.message);
        }
      } catch (e) {
        console.error(`sync ${key}:`, e.message || e);
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
  if (status === "no_family") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>No family yet</h1>
        <p style={{ marginBottom: 8 }}>
          Your account isn't linked to a family. Run the Phase 2 SQL script
          (<code>supabase/schema.sql</code>) in the Supabase SQL Editor — it
          creates the Lynch family and links you by email.
        </p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", padding: 24, fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Couldn't load data</h1>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8 }}>{err}</pre>
      </div>
    );
  }

  return children({ initial: data, currentProfileId, sync, familyId });
}
