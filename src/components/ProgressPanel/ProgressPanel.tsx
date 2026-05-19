import { useEffect, useRef, useState } from "react";
import type { ProgressPanelProps } from "./ProgressPanel.types";

/**
 * Updates the browser tab title to `⚡ {pct}% — {toolName}` while processing,
 * and restores the original title on unmount.
 */
function useProcessingTitle(
  active: boolean,
  pct: number,
  toolName?: string,
): void {
  const originalTitle = useRef<string>("");

  useEffect(() => {
    if (!active || !toolName) return;

    // Capture original title on first activation
    if (!originalTitle.current) {
      originalTitle.current = document.title;
    }

    document.title = `⚡ ${pct}% — ${toolName}`;

    return () => {
      // Restore on unmount or when no longer active
      if (originalTitle.current) {
        document.title = originalTitle.current;
        originalTitle.current = "";
      }
    };
  }, [active, pct, toolName]);

  // Restore title when processing stops (active becomes false)
  useEffect(() => {
    if (!active && originalTitle.current) {
      document.title = originalTitle.current;
      originalTitle.current = "";
    }
  }, [active]);
}

export function ProgressPanel({
  status,
  progress,
  label,
  errorMessage,
  onRetry,
  indeterminate = false,
  showReassurance = false,
  toolName,
}: ProgressPanelProps) {
  const isProcessing = status === "processing";
  const pct = Math.min(100, Math.max(0, progress));

  // Show reassurance message after 3s of processing
  const [reassuranceVisible, setReassuranceVisible] = useState(false);
  useEffect(() => {
    if (!isProcessing) {
      setReassuranceVisible(false);
      return;
    }
    const timer = setTimeout(() => setReassuranceVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isProcessing]);

  // Tab title update during processing
  useProcessingTitle(isProcessing && !!toolName, pct, toolName);

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

  // processing state
  return (
    <div
      className="card fade-in"
      role="status"
      aria-live="polite"
      aria-label={label || "Processing…"}
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
        {!indeterminate && (
          <span
            style={{ fontSize: 13, color: "var(--green)", fontWeight: 700 }}
          >
            {pct}%
          </span>
        )}
      </div>

      {/* Progress bar track */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "var(--surface-3)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {indeterminate ? (
          /* Indeterminate shimmer bar */
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent 0%, var(--green) 40%, #00ccff 60%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        ) : (
          /* Determinate fill bar */
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 4,
              background: "linear-gradient(90deg, var(--green), #00ccff)",
              transition:
                "width 400ms var(--ease-inout, cubic-bezier(0.4,0,0.2,1))",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Shimmer overlay on fill */}
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
        )}

        {/* Star dots (only for determinate mode) */}
        {!indeterminate &&
          [0, 0.3, 0.6, 0.9, 1.2].map((delay, i) => (
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

      {/* Reassurance message — shown after 3s or when showReassurance prop is true */}
      {(showReassurance || reassuranceVisible) && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--green)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            animation: "fadeIn 0.4s ease both",
          }}
          aria-live="polite"
        >
          🛡 Running locally in your browser — no uploads needed.
        </div>
      )}
    </div>
  );
}
