// Treasure-chest milestone takeover. When a streak crosses a milestone
// or a personal best, this layer pops a big chest on screen, the lid
// opens, confetti pours out, the title + subtitle land. Tap anywhere
// or wait 4s to dismiss.
//
// Phases (driven by setTimeout-driven state):
//   1. mount        → backdrop fades in, chest scales up from nothing
//   2. open         → lid lifts (rotation), inner glow blooms
//   3. confetti     → confetti.js fires from chest center
//   4. label        → title + subtitle slide in below the chest
//   5. idle (wait)  → 4s total then auto-dismiss
//
// One layer mounted near the App root; subscribes to milestone.subscribe.

import React, { useEffect, useState } from "react";
import { milestone } from "./lib/milestone.js";
import { confetti } from "./lib/confetti.js";

export default function MilestoneCelebrate() {
  const [event, setEvent] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | mount | open | label

  useEffect(() => {
    return milestone.subscribe((ev) => {
      setEvent(ev);
      setPhase("mount");
    });
  }, []);

  useEffect(() => {
    if (!event) return;
    const timers = [];
    // Phase progression
    timers.push(setTimeout(() => setPhase("open"), 350));
    timers.push(setTimeout(() => {
      // Confetti origin centered where the chest sits.
      confetti({ count: 220, duration: 3000, origin: { x: 0.5, y: 0.45 }, startVelocity: 22 });
      setPhase("label");
    }, 700));
    // Auto-dismiss
    timers.push(setTimeout(() => {
      setPhase("idle");
      setEvent(null);
    }, 4500));
    return () => timers.forEach(clearTimeout);
  }, [event]);

  if (!event) return null;

  const dismiss = () => {
    setPhase("idle");
    setEvent(null);
  };

  const chestScale = phase === "mount" ? "scale-50 opacity-0" : "scale-100 opacity-100";
  const lidRotate = phase === "open" || phase === "label" ? "-rotate-[55deg] -translate-y-3" : "rotate-0 translate-y-0";
  const labelIn = phase === "label" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3";

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      style={{ background: "radial-gradient(ellipse at center, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.95) 100%)" }}
    >
      <div className="relative max-w-md w-full flex flex-col items-center">
        {/* Glow halo behind chest */}
        <div
          className={`absolute w-72 h-72 rounded-full blur-3xl transition-opacity duration-700 ${phase === "open" || phase === "label" ? "opacity-80" : "opacity-0"}`}
          style={{ background: "radial-gradient(circle, #fbbf24cc 0%, transparent 70%)" }}
        />
        {/* Treasure chest — SVG so the lid can rotate independently. */}
        <svg
          viewBox="0 0 200 200"
          width={220}
          height={220}
          className={`relative z-10 transition-all duration-500 ease-out ${chestScale}`}
          style={{ filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.5))" }}
        >
          {/* Chest body */}
          <rect x="30" y="90" width="140" height="80" rx="8" fill="#92400e" />
          <rect x="30" y="90" width="140" height="80" rx="8" fill="url(#chestGrad)" opacity="0.4" />
          {/* Wood planks */}
          <line x1="30" y1="120" x2="170" y2="120" stroke="#78350f" strokeWidth="2" />
          <line x1="30" y1="145" x2="170" y2="145" stroke="#78350f" strokeWidth="2" />
          {/* Iron straps */}
          <rect x="55" y="90" width="6" height="80" fill="#1c1917" />
          <rect x="139" y="90" width="6" height="80" fill="#1c1917" />
          {/* Lock */}
          <rect x="92" y="115" width="16" height="22" rx="3" fill="#fbbf24" />
          <circle cx="100" cy="123" r="3" fill="#1c1917" />
          {/* Lid group — rotates around the back hinge */}
          <g
            className={`transition-transform duration-500 ease-out origin-bottom ${lidRotate}`}
            style={{ transformOrigin: "100px 90px" }}
          >
            <path
              d="M 30 90 Q 30 50 100 50 Q 170 50 170 90 Z"
              fill="#92400e"
            />
            <path
              d="M 30 90 Q 30 50 100 50 Q 170 50 170 90 Z"
              fill="url(#chestGrad)"
              opacity="0.4"
            />
            <rect x="55" y="60" width="6" height="32" fill="#1c1917" />
            <rect x="139" y="60" width="6" height="32" fill="#1c1917" />
          </g>
          {/* Inner glow when open */}
          {(phase === "open" || phase === "label") && (
            <ellipse cx="100" cy="100" rx="60" ry="14" fill="#fde68a" opacity="0.85" />
          )}
          <defs>
            <linearGradient id="chestGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fcd34d" />
              <stop offset="1" stopColor="#78350f" />
            </linearGradient>
          </defs>
        </svg>

        {/* Title + subtitle slide in once the chest is open */}
        <div className={`relative z-10 text-center mt-4 transition-all duration-500 ease-out ${labelIn}`}>
          <div className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
            {event.title}
          </div>
          {event.subtitle && (
            <div className="text-base font-bold text-amber-200 mt-1">{event.subtitle}</div>
          )}
          <div className="text-[11px] text-white/60 mt-3 uppercase tracking-wider font-bold">Tap to close</div>
        </div>
      </div>
    </div>
  );
}
