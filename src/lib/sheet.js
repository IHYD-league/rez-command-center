// sheet.js — shared bottom-sheet drama. Slide-up entrance, backdrop
// blur, drag-down to dismiss, reduced-motion respect. TaskSheet has
// the same logic inlined; reuse here for every other bottom sheet.
//
// Usage:
//
//   const { handleClose, dragHandlers, backdropStyle, sheetStyle } =
//     useBottomSheet({ onClose });
//
//   return (
//     <div className="fixed inset-0 z-40 flex items-end justify-center">
//       <div onClick={handleClose} className="absolute inset-0" style={backdropStyle} />
//       <div className="relative w-full max-w-md bg-white rounded-t-3xl ..." style={sheetStyle}>
//         <div {...dragHandlers}>… drag handle pill …</div>
//         …content…
//         <button onClick={handleClose}>Done</button>
//       </div>
//     </div>
//   );

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion.js";

const ANIM_FULL_MS = 280;
const DISMISS_PX = 120;
const DISMISS_VEL = 0.5; // px/ms — flick threshold

export function useBottomSheet({ onClose }) {
  const reduced = useRef(prefersReducedMotion()).current;
  const ANIM_MS = reduced ? 0 : ANIM_FULL_MS;
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    if (reduced) { onClose(); return; }
    setVisible(false);
    setTimeout(onClose, ANIM_MS);
  };

  const dragHandlers = {
    onPointerDown: (e) => {
      dragStart.current = { y: e.clientY, t: Date.now() };
      setDragging(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    },
    onPointerMove: (e) => {
      if (!dragStart.current) return;
      const dy = e.clientY - dragStart.current.y;
      setDragOffset(Math.max(0, dy));
    },
    onPointerUp: (e) => {
      if (!dragStart.current) return;
      const dy = e.clientY - dragStart.current.y;
      const dt = Date.now() - dragStart.current.t;
      const velocity = dy / Math.max(1, dt);
      dragStart.current = null;
      setDragging(false);
      if (dy > DISMISS_PX || velocity > DISMISS_VEL) handleClose();
      else setDragOffset(0);
    },
  };
  dragHandlers.onPointerCancel = dragHandlers.onPointerUp;

  return {
    visible,
    handleClose,
    dragHandlers,
    backdropStyle: {
      background: "rgba(15, 23, 42, 0.5)",
      backdropFilter: visible ? "blur(6px)" : "blur(0px)",
      WebkitBackdropFilter: visible ? "blur(6px)" : "blur(0px)",
      opacity: visible ? 1 : 0,
      transition: `opacity ${ANIM_MS}ms ease-out, backdrop-filter ${ANIM_MS}ms ease-out, -webkit-backdrop-filter ${ANIM_MS}ms ease-out`,
    },
    sheetStyle: {
      transform: visible ? `translateY(${dragOffset}px)` : "translateY(100%)",
      // During an active drag the sheet must track the finger 1:1 with
      // no easing. On release / mount / dismiss the transition kicks
      // back in for a clean slide.
      transition: dragging ? "none" : `transform ${ANIM_MS}ms cubic-bezier(.32,.72,0,1)`,
      willChange: "transform",
    },
  };
}

export default useBottomSheet;
