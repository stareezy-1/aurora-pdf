import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { NavBar } from "@/components/NavBar/NavBar";
import { Footer } from "@/components/Footer/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TOOL_REGISTRY, getToolsByCategory } from "@/lib/tool-registry";

// ── Category filter tabs ───────────────────────────────────────────────────

type FilterTab =
  | "All"
  | "Convert"
  | "Edit"
  | "Organize"
  | "Optimize"
  | "Secure";

const FILTER_TABS: FilterTab[] = [
  "All",
  "Convert",
  "Edit",
  "Organize",
  "Optimize",
  "Secure",
];

const CATEGORY_MAP: Record<FilterTab, string[]> = {
  All: [],
  Convert: ["convert-to", "convert-from"],
  Edit: ["edit"],
  Organize: ["organize"],
  Optimize: ["optimize"],
  Secure: ["secure"],
};

// ── Animated counter ───────────────────────────────────────────────────────

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <>
      {count.toLocaleString()}
      {suffix}
    </>
  );
}

// ── Floating PDF asset ─────────────────────────────────────────────────────

function FloatingPdfAsset() {
  return (
    <div
      style={{ position: "relative", width: 280, height: 320, flexShrink: 0 }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          inset: -40,
          background:
            "radial-gradient(ellipse at center, rgba(0,255,136,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "pulse 3s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: -8,
          bottom: -8,
          background: "var(--surface-2)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          transform: "rotate(4deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--surface)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,255,136,0.1)",
          overflow: "hidden",
          animation: "float 4s ease-in-out infinite",
        }}
      >
        <div
          style={{
            height: 48,
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
          <div
            style={{
              flex: 1,
              height: 6,
              background: "var(--border)",
              borderRadius: 3,
              marginLeft: 8,
            }}
          />
        </div>
        <div
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              height: 14,
              background: "linear-gradient(90deg, var(--green), transparent)",
              borderRadius: 4,
              width: "70%",
              opacity: 0.7,
            }}
          />
          {[90, 100, 75, 85, 60].map((w, i) => (
            <div
              key={i}
              style={{
                height: 8,
                background: "var(--border-2)",
                borderRadius: 4,
                width: `${w}%`,
                opacity: 0.5,
              }}
            />
          ))}
          <div
            style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
          />
          {[80, 95, 65].map((w, i) => (
            <div
              key={i}
              style={{
                height: 8,
                background: "var(--border-2)",
                borderRadius: 4,
                width: `${w}%`,
                opacity: 0.4,
              }}
            />
          ))}
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>🛡</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  height: 7,
                  background: "var(--green)",
                  borderRadius: 3,
                  width: 100,
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  height: 6,
                  background: "var(--border-2)",
                  borderRadius: 3,
                  width: 70,
                  opacity: 0.4,
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: -12,
          right: -20,
          background: "var(--surface)",
          border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: 20,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--green)",
          boxShadow: "0 4px 16px rgba(0,255,136,0.2)",
          animation: "float 3s ease-in-out infinite 0.5s",
          whiteSpace: "nowrap",
        }}
      >
        ✓ 100% Local
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: -28,
          background: "var(--surface)",
          border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 20,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--purple)",
          boxShadow: "0 4px 16px rgba(124,58,237,0.2)",
          animation: "float 3.5s ease-in-out infinite 1s",
          whiteSpace: "nowrap",
        }}
      >
        🔒 Zero Upload
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -10,
          left: -20,
          background: "var(--surface)",
          border: "1px solid rgba(0,204,255,0.3)",
          borderRadius: 20,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 700,
          color: "#00ccff",
          boxShadow: "0 4px 16px rgba(0,204,255,0.2)",
          animation: "float 4s ease-in-out infinite 1.5s",
          whiteSpace: "nowrap",
        }}
      >
        ⚡ Instant
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

const TOOL_COUNT = TOOL_REGISTRY.length;

export default function HomePage() {
  usePageTitle("Home");
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const visibleTools =
    activeTab === "All"
      ? TOOL_REGISTRY
      : TOOL_REGISTRY.filter((t) =>
          CATEGORY_MAP[activeTab].includes(t.category),
        );

  return (
    <div
      className="page-wrap"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <style>{`
        @media (max-width: 600px) {
          .home-tool-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-asset { display: none !important; }
        }
        .filter-tab {
          padding: 7px 16px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font);
          white-space: nowrap;
        }
        .filter-tab:hover { border-color: var(--border-2); color: var(--text); }
        .filter-tab.active { background: var(--green); border-color: var(--green); color: #050505; }
        .tool-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 18px;
          text-decoration: none;
          transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .tool-card:hover {
          transform: translateY(-2px);
          background: var(--surface);
        }
        .feature-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .feature-card:hover { border-color: var(--border-2); transform: translateY(-2px); }
      `}</style>

      <NavBar currentPath={location.pathname} />

      <main style={{ flex: 1 }}>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "clamp(48px, 8vw, 96px) 20px clamp(56px, 8vw, 96px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -200,
              left: "50%",
              transform: "translateX(-50%)",
              width: 800,
              height: 600,
              background:
                "radial-gradient(ellipse at center, rgba(0,255,136,0.06) 0%, rgba(124,58,237,0.04) 40%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              opacity: 0.3,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 48,
              flexWrap: "wrap",
              position: "relative",
            }}
          >
            <div style={{ flex: "1 1 400px", maxWidth: 560 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "rgba(0,255,136,0.08)",
                  border: "1px solid rgba(0,255,136,0.2)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--green)",
                  marginBottom: 24,
                  letterSpacing: "0.04em",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--green)",
                    animation: "pulse 2s ease-in-out infinite",
                    display: "inline-block",
                  }}
                />
                FREE · OPEN SOURCE · PRIVACY-FIRST
              </div>

              <h1
                style={{
                  fontSize: "clamp(36px, 5.5vw, 64px)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, var(--text) 0%, var(--text-2) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  PDF tools that
                </span>
                <br />
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, var(--green) 0%, #00ccff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  never see your files.
                </span>
              </h1>

              <p
                style={{
                  fontSize: "clamp(15px, 2vw, 18px)",
                  color: "var(--text-2)",
                  lineHeight: 1.7,
                  marginBottom: 32,
                  maxWidth: 480,
                }}
              >
                <strong style={{ color: "var(--text)" }}>
                  {TOOL_COUNT}+ powerful PDF utilities
                </strong>{" "}
                — compress, convert, edit, sign, merge, split, watermark and
                more. Everything runs{" "}
                <strong style={{ color: "var(--text)" }}>
                  100% in your browser
                </strong>
                . Your files never touch a server.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 40,
                }}
              >
                <Link
                  to="/compress"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "13px 28px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--green)",
                    color: "#050505",
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(0,255,136,0.35)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 28px rgba(0,255,136,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 4px 20px rgba(0,255,136,0.35)";
                  }}
                >
                  🚀 Try it free
                </Link>
                <a
                  href="#tools"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "13px 24px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontWeight: 600,
                    fontSize: 15,
                    textDecoration: "none",
                    border: "1px solid var(--border)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border-2)";
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border)";
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--surface)";
                  }}
                >
                  Browse {TOOL_COUNT} tools ↓
                </a>
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[
                  { icon: "🛡", label: "No uploads ever" },
                  { icon: "🔓", label: "No account needed" },
                  { icon: "⚡", label: "Instant processing" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="hero-asset"
              style={{
                flex: "0 0 auto",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <FloatingPdfAsset />
            </div>
          </div>
        </section>

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "24px 20px",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              justifyContent: "center",
              gap: "clamp(24px, 6vw, 80px)",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: TOOL_COUNT, suffix: "+", label: "PDF Tools" },
              { value: 100, suffix: "%", label: "Client-Side" },
              { value: 0, suffix: "", label: "Uploads" },
              { value: 0, suffix: "", label: "Accounts" },
            ].map(({ value, suffix, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "clamp(24px, 4vw, 36px)",
                    fontWeight: 900,
                    color: "var(--green)",
                    lineHeight: 1,
                  }}
                >
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 4,
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section
          style={{
            padding: "clamp(48px, 6vw, 80px) 20px",
            background: "var(--bg)",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                How it works
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                Three steps. No server. No waiting.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 24,
              }}
            >
              {[
                {
                  step: "01",
                  icon: "📂",
                  title: "Drop your file",
                  desc: "Drag & drop or click to select. Supports PDF, Word, Excel, images and more.",
                },
                {
                  step: "02",
                  icon: "⚡",
                  title: "Process locally",
                  desc: "Your browser handles everything using WebAssembly. Zero network requests.",
                },
                {
                  step: "03",
                  icon: "⬇",
                  title: "Download instantly",
                  desc: "Get your file immediately. All temporary data is wiped from memory.",
                },
              ].map(({ step, icon, title, desc }) => (
                <div
                  key={step}
                  className="feature-card"
                  style={{ position: "relative", overflow: "hidden" }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontSize: 48,
                      fontWeight: 900,
                      color: "var(--border)",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {step}
                  </div>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 8,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tool grid ─────────────────────────────────────────────────── */}
        <section
          id="tools"
          style={{
            padding: "clamp(48px, 6vw, 80px) 20px",
            background: "var(--surface)",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                {TOOL_COUNT}+ tools. One place.
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  maxWidth: 480,
                  margin: "0 auto",
                }}
              >
                Everything you need to work with PDFs — free, private, instant.
                No uploads, no accounts.
              </p>
            </div>

            {/* Filter tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
                marginBottom: 32,
              }}
            >
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  className={`filter-tab${activeTab === tab ? " active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                >
                  {tab}
                  {tab !== "All" && (
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                      (
                      {tab === "Convert"
                        ? TOOL_REGISTRY.filter((t) =>
                            ["convert-to", "convert-from"].includes(t.category),
                          ).length
                        : getToolsByCategory(tab.toLowerCase() as any).length}
                      )
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div
              className="home-tool-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 12,
              }}
              role="list"
              aria-label="Available PDF tools"
            >
              {visibleTools.map(
                ({ path, name, icon, color, bg, description }) => (
                  <Link
                    key={path}
                    to={path}
                    role="listitem"
                    aria-label={name}
                    className="tool-card"
                    style={{ "--tool-color": color } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = color;
                      el.style.boxShadow = `0 8px 24px ${color}22`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = "var(--border)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "var(--radius-md)",
                        background: bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: 3,
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          lineHeight: 1.5,
                        }}
                      >
                        {description}
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: "auto",
                        fontSize: 11,
                        color,
                        fontWeight: 600,
                      }}
                    >
                      Open →
                    </div>
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>

        {/* ── Feature highlights ────────────────────────────────────────── */}
        <section
          style={{
            padding: "clamp(48px, 6vw, 80px) 20px",
            background: "var(--bg)",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                Why AuroraPDF?
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                Built different from every other PDF tool out there.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  icon: "🛡",
                  color: "#00ff88",
                  title: "Zero server uploads",
                  desc: "Your files never leave your device. All processing happens in your browser using WebAssembly and pdf-lib.",
                },
                {
                  icon: "⚡",
                  color: "#f59e0b",
                  title: "Instant results",
                  desc: "No queues, no waiting for server processing. Everything runs at native speed directly in your browser.",
                },
                {
                  icon: "🔓",
                  color: "#00ccff",
                  title: "No account required",
                  desc: "Open a tool, use it, download your file. No sign-up, no email, no subscription — ever.",
                },
                {
                  icon: "📱",
                  color: "#7c3aed",
                  title: "Works offline",
                  desc: "Install as a PWA and use all tools without an internet connection. Your data stays on your device.",
                },
                {
                  icon: "🔒",
                  color: "#ef4444",
                  title: "Open source",
                  desc: "Full source code on GitHub. Audit it, fork it, contribute to it. No black boxes.",
                },
                {
                  icon: "🌍",
                  color: "#4ade80",
                  title: "Free forever",
                  desc: "No freemium tricks, no file size limits, no watermarks. Every tool is completely free.",
                },
              ].map(({ icon, color, title, desc }) => (
                <div key={title} className="feature-card">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-md)",
                      background: `${color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      marginBottom: 14,
                    }}
                  >
                    {icon}
                  </div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 8,
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Privacy CTA ───────────────────────────────────────────────── */}
        <section
          style={{
            padding: "clamp(48px, 6vw, 80px) 20px",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              background:
                "linear-gradient(135deg, rgba(0,255,136,0.04) 0%, rgba(124,58,237,0.04) 100%)",
              border: "1px solid rgba(0,255,136,0.15)",
              borderRadius: "var(--radius-xl)",
              padding: "clamp(32px, 5vw, 56px)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -80,
                left: "50%",
                transform: "translateX(-50%)",
                width: 400,
                height: 300,
                background:
                  "radial-gradient(ellipse, rgba(0,255,136,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡</div>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 12,
              }}
            >
              Your privacy is the product.
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-2)",
                lineHeight: 1.7,
                maxWidth: 560,
                margin: "0 auto 32px",
              }}
            >
              Most PDF tools upload your files to their servers. AuroraPDF is
              different — every operation runs in your browser using
              WebAssembly. We literally cannot see your files.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: "🚫", text: "No server uploads" },
                { icon: "🔒", text: "No data storage" },
                { icon: "👤", text: "No accounts" },
                { icon: "📊", text: "No file analytics" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 20,
                    background: "rgba(0,255,136,0.06)",
                    border: "1px solid rgba(0,255,136,0.15)",
                    fontSize: 13,
                    color: "var(--green)",
                    fontWeight: 600,
                  }}
                >
                  <span>{icon}</span> {text}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
