import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import DataProvider from "./DataProvider.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
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
  </ErrorBoundary>
);
