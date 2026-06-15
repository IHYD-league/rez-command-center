// Tiny inline canvas confetti — no dep, ~80 lines. Spawns N
// particles in a burst with gravity + drag + rotation, fades out,
// removes the canvas. Default duration ~2.5s. Mounted to body so
// it floats above every sheet without competing with z-indexes.

const DEFAULT_COLORS = [
  "#f59e0b", "#ef4444", "#ec4899", "#a855f7", "#3b82f6",
  "#10b981", "#84cc16", "#06b6d4", "#fb923c", "#facc15",
];

export function confetti({
  count = 180,
  duration = 2500,
  spread = 70,       // degrees from straight-up
  startVelocity = 18,
  gravity = 0.45,
  drag = 0.985,
  colors = DEFAULT_COLORS,
  origin = { x: 0.5, y: 0.65 }, // 0..1 of viewport
} = {}) {
  if (typeof window === "undefined") return;
  // Per-canvas, dispose on end. Multiple concurrent bursts overlay
  // cleanly because each owns its own canvas.
  const canvas = document.createElement("canvas");
  canvas.style.cssText = [
    "position:fixed",
    "inset:0",
    "pointer-events:none",
    "z-index:9999",
  ].join(";");
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const ox = origin.x * w;
  const oy = origin.y * h;
  const rad = (deg) => (deg * Math.PI) / 180;
  const particles = Array.from({ length: count }, () => {
    const angle = -90 + (Math.random() - 0.5) * spread;
    const speed = startVelocity * (0.6 + Math.random() * 0.8);
    return {
      x: ox,
      y: oy,
      vx: Math.cos(rad(angle)) * speed,
      vy: Math.sin(rad(angle)) * speed,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 1,
      // Slight variety: a third are tall confetti strips, rest are squares
      shape: Math.random() < 0.33 ? "strip" : "square",
    };
  });

  const start = performance.now();
  let raf;
  const step = (t) => {
    const elapsed = t - start;
    const fadeFrom = duration * 0.55;
    const alpha = elapsed < fadeFrom ? 1 : Math.max(0, 1 - (elapsed - fadeFrom) / (duration - fadeFrom));
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= drag;
      p.vy = p.vy * drag + gravity;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      if (p.shape === "strip") {
        ctx.fillRect(-p.size * 0.6, -p.size * 1.5, p.size * 1.2, p.size * 3);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
    if (elapsed < duration) {
      raf = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(step);

  // Safety: cap at 1.25× duration in case the tab background-throttled
  // requestAnimationFrame and we drift past intended cleanup.
  setTimeout(() => {
    cancelAnimationFrame(raf);
    if (canvas.parentNode) canvas.remove();
  }, duration * 1.25);
}
