import type { InstallState } from "@/hooks/usePwaInstall";

interface PwaInstallModalProps {
  state: InstallState;
  onInstall: () => void;
  onDismiss: () => void;
}

const FEATURES = [
  { icon: "⚡", text: "Works offline — no internet needed" },
  { icon: "🛡", text: "Files never leave your device" },
  { icon: "🚀", text: "Instant launch from home screen" },
  { icon: "📱", text: "Native app feel on any device" },
];

export function PwaInstallModal({
  state,
  onInstall,
  onDismiss,
}: PwaInstallModalProps) {
  const isInstalling = state === "installing";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-title"
        aria-describedby="pwa-desc"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 301,
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          borderRadius: "24px 24px 0 0",
          padding: "8px 0 0",
          animation: "slideUp 0.3s cubic-bezier(0.4,0,0.2,1)",
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 16px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "var(--border-2)",
            }}
          />
        </div>

        <div style={{ padding: "0 24px 32px" }}>
          {/* App icon + name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #050505, #1a1a2e)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 16px rgba(0,255,136,0.2)",
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  fontFamily: "system-ui,sans-serif",
                  background: "linear-gradient(135deg, #00ff88, #7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                A
              </span>
            </div>
            <div>
              <h2
                id="pwa-title"
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Install AuroraPDF
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: "4px 0 0",
                }}
              >
                aurora-pdf.vercel.app
              </p>
            </div>
          </div>

          {/* Description */}
          <p
            id="pwa-desc"
            style={{
              fontSize: 14,
              color: "var(--text-2)",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            Add AuroraPDF to your home screen for instant access to all 11 PDF
            tools — even without an internet connection.
          </p>

          {/* Feature list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {FEATURES.map(({ icon, text }) => (
              <div
                key={text}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: "rgba(0,255,136,0.08)",
                    border: "1px solid rgba(0,255,136,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {icon}
                </div>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(0,255,136,0.06)",
              border: "1px solid rgba(0,255,136,0.15)",
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 16 }}>🔒</span>
            <span
              style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}
            >
              No data collected. No account required. 100% free.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={onInstall}
              disabled={isInstalling}
              aria-label="Install AuroraPDF app"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: isInstalling
                  ? "rgba(0,255,136,0.5)"
                  : "linear-gradient(135deg, #00ff88, #00cc6a)",
                color: "#050505",
                fontSize: 16,
                fontWeight: 700,
                cursor: isInstalling ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
                boxShadow: isInstalling
                  ? "none"
                  : "0 4px 16px rgba(0,255,136,0.35)",
                fontFamily: "var(--font)",
              }}
            >
              {isInstalling ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2px solid #050505",
                      borderTopColor: "transparent",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Installing…
                </>
              ) : (
                <>⬇ Install App</>
              )}
            </button>

            <button
              onClick={onDismiss}
              aria-label="Not now"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font)",
                transition: "all 0.15s",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
