import type { ProgressPanelProps } from "./ProgressPanel.types";

export function ProgressPanel({
  status,
  progress,
  label,
  errorMessage,
  onRetry,
}: ProgressPanelProps) {
  if (status === "idle") return null;

  if (status === "error") {
    return (
      <div
        className="alert alert-error fade-in"
        role="alert"
        style={{ marginTop: 20 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Processing failed
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {errorMessage ?? "An error occurred."}
          </div>
        </div>
        {onRetry && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRetry}
            aria-label="Try again"
            style={{ marginTop: 10, flexShrink: 0 }}
          >
            ↩ Try Again
          </button>
        )}
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        className="alert alert-info fade-in"
        role="status"
        aria-live="polite"
        style={{ marginTop: 20 }}
      >
        ✓ Processing complete — your file is ready.
      </div>
    );
  }

  // processing
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <div
      className="card fade-in"
      role="status"
      aria-live="polite"
      style={{ marginTop: 20 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
          {label || "Processing…"}
        </span>
        <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}>
          {pct}%
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "var(--surface-3)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: "linear-gradient(90deg, var(--green), #00ccff)",
            transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Shimmer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        </div>

        {/* Star dots */}
        {[0, 0.3, 0.6, 0.9, 1.2].map((delay, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              left: `${Math.max(0, pct - 8 - i * 4)}%`,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--green)",
              animation: `star-drift 1.4s ${delay}s ease-in-out infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Spinner row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid var(--border-2)",
            borderTopColor: "var(--green)",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Working in your browser — no uploads
        </span>
      </div>
    </div>
  );
}
