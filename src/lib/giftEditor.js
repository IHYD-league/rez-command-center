// giftEditor.js — module-level pub/sub for the bonus-star edit sheet.
//
// Anywhere a parent sees a gift row (Star Ledger, DayBreakdown,
// Portfolio, ParentToday Done, KidStars Bonus, Earned-today detail),
// the row's onClick handler calls giftEditor.open(gift). A single
// EditGiftSheet mounted at App root subscribes and renders.
//
// Same pattern as lightbox.js. No React context, no provider plumbing,
// no prop drilling. Mike's rule: "we really need to make editing for
// parents across this app easy" — one call site per surface, identical
// behavior everywhere.

let listeners = new Set();
let current = null; // gift object | null

function notify() {
  for (const fn of listeners) {
    try { fn(current); } catch (e) { /* listener errors don't break each other */ }
  }
}

export const giftEditor = {
  open(gift) {
    if (!gift) return;
    current = gift;
    notify();
  },
  close() {
    if (!current) return;
    current = null;
    notify();
  },
  subscribe(fn) {
    listeners.add(fn);
    try { fn(current); } catch (e) {}
    return () => listeners.delete(fn);
  },
};
