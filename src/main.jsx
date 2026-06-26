import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import DataProvider from "./DataProvider.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import SharedKidView from "./SharedKidView.jsx";

// Share-link short-circuit: if the URL is /share/<token>, render the
// public read-only kid view INSTEAD of the auth gate. Grandparents tap
// the link and never see a login screen — they just see the kid's
// celebration page. Pure pathname match; no router needed.
function shareTokenFromPath() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/^\/share\/([0-9a-f-]{20,})\/?$/i);
  return m ? m[1] : null;
}

const shareToken = shareTokenFromPath();

// Service worker registration. Lives at the entry boot (NOT inside
// the React tree, NOT in App.jsx) so it runs as a one-time side-effect
// regardless of which screen the app renders first. The SW itself
// (public/sw.js) is hand-rolled with explicit cache rules — see the
// invariants at the top of that file. Failures here are non-fatal:
// the app must work without an SW (every non-installed browser tab
// experiences exactly this code path with the registration silently
// skipped or failed). Registered on the `load` event so we don't
// compete with the first paint for network / CPU.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* non-fatal */ });
  });
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    {shareToken ? (
      <SharedKidView
        token={shareToken}
        onExit={() => { window.location.href = "/"; }}
      />
    ) : (
      <AuthGate>
        {({ session, signOut, sessionEmail }) => (
          <DataProvider session={session} signOut={signOut} sessionEmail={sessionEmail}>
            {({ initial, currentProfileId, sync, familyId }) => (
              <App
                initial={initial}
                currentProfileId={currentProfileId}
                sync={sync}
                familyId={familyId}
                signOut={signOut}
                sessionEmail={sessionEmail}
              />
            )}
          </DataProvider>
        )}
      </AuthGate>
    )}
  </ErrorBoundary>
);
