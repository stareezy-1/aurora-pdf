import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function AboutPage() {
  usePageTitle("About — AuroraPDF");

  return (
    <ToolLayout toolName="About">
      <main className="page-content">
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "clamp(32px, 5vw, 64px) 0",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 900,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            About AuroraPDF
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-muted)",
              marginBottom: 40,
            }}
          >
            Free, privacy-first PDF tools built for everyone.
          </p>

          {/* Creator card */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(24px, 4vw, 40px)",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              {/* Avatar / initials */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--green), #00ccff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#050505",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                MB
              </div>
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: 2,
                  }}
                >
                  Muhammad Bintang Al Akbar
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--green)",
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  @Stareezy
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Front End Engineer
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "var(--text-2)",
                lineHeight: 1.7,
                marginBottom: 20,
              }}
            >
              AuroraPDF was built out of frustration with PDF tools that upload
              your files to remote servers. Every operation in AuroraPDF runs
              100% in your browser — your files never leave your device.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://stareezy.tech"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(0,255,136,0.08)",
                  border: "1px solid rgba(0,255,136,0.2)",
                  color: "var(--green)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                🌐 stareezy.tech
              </a>
              <a
                href="https://github.com/stareezy-1/aurora-pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Bio section */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(24px, 4vw, 40px)",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 12,
              }}
            >
              Privacy-first philosophy
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-2)",
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              Most online PDF tools send your documents to a server for
              processing. This means your sensitive files — contracts, medical
              records, financial documents — pass through someone else's
              infrastructure.
            </p>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-2)",
                lineHeight: 1.7,
              }}
            >
              AuroraPDF uses WebAssembly and modern browser APIs to process
              everything locally. We literally cannot see your files because
              they never reach our servers. No account required, no data stored,
              no analytics on your documents.
            </p>
          </div>
        </div>
      </main>
    </ToolLayout>
  );
}
