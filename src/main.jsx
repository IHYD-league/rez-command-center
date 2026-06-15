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
