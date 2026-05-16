import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[AuroraPDF] Unhandled render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#050505",
            color: "#fff",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 48 }}>⚠️</p>
          <h1 style={{ fontSize: 22, color: "#ff8888" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#aaa", maxWidth: 480 }}>{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            aria-label="Reload the application"
            style={{
              background: "#00ff88",
              color: "#050505",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
