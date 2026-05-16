import { Link, useLocation } from "react-router";
import { NavBar } from "@/components/NavBar/NavBar";
import { Footer } from "@/components/Footer/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TOOL_DESCRIPTIONS } from "@/lib/format-utils";

const TOOLS = [
  {
    path: "/compress",
    name: "Compress PDF",
    icon: "🗜️",
    color: "#00ff88",
    bg: "rgba(0,255,136,0.08)",
  },
  {
    path: "/ocr",
    name: "OCR: Images to PDF",
    icon: "🔍",
    color: "#00ccff",
    bg: "rgba(0,204,255,0.08)",
  },
  {
    path: "/pdf-to-jpg",
    name: "PDF to JPG",
    icon: "🖼️",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
  {
    path: "/pdf-to-word",
    name: "PDF to Word",
    icon: "📝",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
  },
  {
    path: "/word-to-pdf",
    name: "Word to PDF",
    icon: "📄",
    color: "#00ff88",
    bg: "rgba(0,255,136,0.08)",
  },
  {
    path: "/pdf-to-excel",
    name: "PDF to Excel",
    icon: "📊",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
  },
  {
    path: "/excel-to-pdf",
    name: "Excel to PDF",
    icon: "📋",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
  {
    path: "/edit",
    name: "Edit PDF",
    icon: "✏️",
    color: "#00ccff",
    bg: "rgba(0,204,255,0.08)",
  },
  {
    path: "/sign",
    name: "Sign PDF",
    icon: "✍️",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
  },
  {
    path: "/watermark",
    name: "Add Watermark",
    icon: "💧",
    color: "#00ff88",
    bg: "rgba(0,255,136,0.08)",
  },
  {
    path: "/split",
    name: "Split PDF",
    icon: "✂️",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
];

export default function HomePage() {
  usePageTitle();
  const location = useLocation();

  return (
    <div className="page-wrap">
      <NavBar currentPath={location.pathname} />

      <main
        style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px 80px" }}
      >
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 20,
              background: "rgba(0,255,136,0.1)",
              border: "1px solid rgba(0,255,136,0.2)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--green)",
              marginBottom: 20,
            }}
          >
            🛡 Zero-Server · Total Privacy · 100% Local
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 16,
              background:
                "linear-gradient(135deg, var(--text) 0%, var(--text-2) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            PDF tools that respect
            <br />
            your privacy
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--text-2)",
              maxWidth: 520,
              margin: "0 auto 32px",
            }}
          >
            11 powerful PDF utilities. All processing happens in your browser —
            your files never leave your device.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 20px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            <span style={{ fontSize: 20 }}>🔒</span>
            <span>
              No uploads. No accounts. No tracking. Files stay on your device.
            </span>
          </div>
        </div>

        {/* Tool grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
          role="list"
          aria-label="Available tools"
        >
          {TOOLS.map(({ path, name, icon, color, bg }) => (
            <Link
              key={path}
              to={path}
              role="listitem"
              aria-label={name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 20,
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = color;
                (e.currentTarget as HTMLElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  `0 8px 24px ${color}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  background: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 4,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {TOOL_DESCRIPTIONS[name] ?? ""}
                </div>
              </div>
              <div
                style={{
                  marginTop: "auto",
                  fontSize: 12,
                  color,
                  fontWeight: 600,
                }}
              >
                Open tool →
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
