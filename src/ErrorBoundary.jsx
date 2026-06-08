import React from "react";

// Catches render errors anywhere in the tree below. Without this, a thrown
// error during render unmounts the whole React tree and the user sees a
// blank white screen with no signal. With this, we render the error in
// place plus a reload button — and the message is visible enough that
// the user can screenshot it for us.
//
// Wrap the App tree (not just sub-trees) so the first responder is here,
// not a higher-level Vite/React surface that just shows nothing.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const msg = (this.state.error && (this.state.error.message || String(this.state.error))) || "Unknown error";
    const stack = this.state.info?.componentStack || "";
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
          color: "#0f172a",
          background: "#fef2f2",
          overflowY: "auto",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
            Something broke
          </div>
          <div style={{ fontSize: 14, color: "#7f1d1d", marginBottom: 18 }}>
            The screen didn't render. Reload usually fixes it; if it keeps
            happening, screenshot this and send it to Dad.
          </div>

          <div style={{ background: "white", border: "1px solid #fecaca", borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#991b1b", marginBottom: 6 }}>
              Error
            </div>
            <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0, color: "#7f1d1d" }}>
              {msg}
            </pre>
          </div>

          {stack && (
            <details style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginBottom: 14 }}>
              <summary style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#475569", cursor: "pointer" }}>
                Component stack
              </summary>
              <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", margin: "8px 0 0 0", color: "#475569" }}>
                {stack}
              </pre>
            </details>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 16,
              background: "#10b981",
              color: "white",
              fontWeight: 800,
              fontSize: 16,
              border: 0,
              cursor: "pointer",
            }}
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
