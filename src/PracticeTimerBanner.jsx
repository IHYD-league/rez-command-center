import React, { useEffect, useState } from "react";
import { Drum } from "lucide-react";
import { practiceTimerStore } from "./lib/practiceTimerStore.js";

// PracticeTimerBanner — pinned strip directly below the TopBar that
// stays visible from every tab while a practice timer is running. Tap
// to jump back to More → Practice Timer where the user can hit Stop &
// save. The timer keeps ticking via the module-level singleton store
// regardless of which screen is mounted.
export default function PracticeTimerBanner({ activities = [], onOpen }) {
  const [session, setSession] = useState(() => practiceTimerStore.get());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => practiceTimerStore.subscribe(setSession), []);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  if (!session) return null;

  const activity = activities.find((a) => a.id === session.activityId);
  const accent = activity?.color || "#7c3aed";
  const elapsed = Math.max(0, Math.floor((now - session.startedAt) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full px-3 py-2 flex items-center gap-2 text-left active:scale-[0.99] transition"
      style={{
        background: `linear-gradient(90deg, ${accent}, #f43f5e)`,
        color: "white",
      }}
    >
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
        style={{ background: "rgba(255,255,255,0.22)" }}
        aria-hidden
      >
        <Drum size={15} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wider opacity-90">
          {activity?.name || "Practice"} · still running
        </span>
        <span className="block text-[12px] font-bold leading-tight truncate">
          Tap to stop &amp; save · {mm}:{ss}
        </span>
      </span>
      <span
        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: "rgba(255,255,255,0.22)" }}
      >
        LIVE
      </span>
    </button>
  );
}
