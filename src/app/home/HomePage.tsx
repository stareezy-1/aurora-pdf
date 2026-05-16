import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { NavBar } from "@/components/NavBar/NavBar";
import { Footer } from "@/components/Footer/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { TOOL_DESCRIPTIONS } from "@/lib/format-utils";

// ── Tool registry ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    path: "/compress",
    name: "Compress PDF",
    icon: "🗜️",
    color: "#00ff88",
    bg: "rgba(0,255,136,0.08)",
    category: "optimize",
  },
  {
    path: "/ocr",
    name: "OCR: Images to PDF",
    icon: "🔍",
    color: "#00ccff",
    bg: "rgba(0,204,255,0.08)",
    category: "convert",
  },
  {
    path: "/pdf-to-jpg",
    name: "PDF to JPG",
    icon: "🖼️",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    category: "convert",
  },
  {
    path: "/pdf-to-word",
    name: "PDF to Word",
    icon: "📝",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    category: "convert",
  },
  {
    path: "/word-to-pdf",
    name: "Word to PDF",
    icon: "📄",
    color: "#00ff88",
    bg: "rgba(0,255,136,0.08)",
    category: "convert",
  },
  {
    path: "/pdf-to-excel",
    name: "PDF to Excel",
    icon: "📊",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.08)",
    category: "convert",
  },
  {
    path: "/excel-to-pdf",
    name: "Excel to PDF",
    icon: "📋",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    category: "convert",
  },
  {
    path: "/html-to-pdf",
    name: "HTML to PDF",
    icon: "🌐",
    color: "#00ccff",
    bg: "rgba(0,204,255,0.08)",
    category: "convert",
  },
  {
    path: "/edit",
    name: "Edit PDF",
    icon: "✏️",
    color: "#00ccff",
    bg: "rgba(0,204,255,0.08)",
    category: "edit",
  },
  {
    path: "/sign",
    name: "Sign PDF",
    icon: "✍️",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    category: "edit",
  },
  {
    path: "/watermark",
    name: "Add Watermark",
    icon: "💧",
    color: "#00ff88",
    bg: "rgba(0,255,136,0.08)",
    category: "edit",
  },
  {
    path: "/organize",
    name: "Organize PDF",
    icon: "📑",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    category: "edit",
  },
  {
    path: "/split",
    name: "Split PDF",
    icon: "✂️",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    category: "edit",
  },
  {
    path: "/protect",
    name: "Protect PDF",
    icon: "🔐",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    category: "security",
  },
];

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

// ── Floating PDF document SVG asset ───────────────────────────────────────

function FloatingPdfAsset() {
  return (
    <div
      style={{ position: "relative", width: 280, height: 320, flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Glow */}
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

      {/* Back document (shadow) */}
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

      {/* Main document */}
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
        {/* Document header */}
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

        {/* Document body */}
        <div
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Title line */}
          <div
            style={{
              height: 14,
              background: "linear-gradient(90deg, var(--green), transparent)",
              borderRadius: 4,
              width: "70%",
              opacity: 0.7,
            }}
          />
          {/* Text lines */}
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
          {/* Divider */}
          <div
            style={{ height: 1, background: "var(--border)", margin: "4px 0" }}
          />
          {/* More lines */}
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
          {/* Green accent block */}
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

      {/* Floating badges */}
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

export default function HomePage() {
  usePageTitle("Home");
  const location = useLocation();

  return (
    <div
      className="page-wrap"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <NavBar currentPath={location.pathname} />

      <main style={{ flex: 1 }}>
        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "clamp(48px, 8vw, 96px) 20px clamp(56px, 8vw, 96px)",
          }}
        >
          {/* Background aurora glow */}
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
          {/* Grid overlay */}
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
            {/* Left: copy */}
            <div style={{ flex: "1 1 400px", maxWidth: 560 }}>
              {/* Badge */}
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

              {/* Headline */}
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

              {/* Sub-copy */}
              <p
                style={{
                  fontSize: "clamp(15px, 2vw, 18px)",
                  color: "var(--text-2)",
                  lineHeight: 1.7,
                  marginBottom: 32,
                  maxWidth: 480,
                }}
              >
                14 powerful PDF utilities — compress, convert, edit, sign,
                watermark, split and more. Everything runs{" "}
                <strong style={{ color: "var(--text)" }}>
                  100% in your browser
                </strong>
                . Your files never touch a server.
              </p>

              {/* CTA buttons */}
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
                  Browse tools ↓
                </a>
              </div>

              {/* Trust signals */}
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

            {/* Right: visual asset */}
            <div
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
              { value: 14, suffix: "", label: "PDF Tools" },
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
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: 28,
                    position: "relative",
                    overflow: "hidden",
                  }}
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
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                14 tools. One place.
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                Everything you need to work with PDFs — free, private, instant.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 14,
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
                    background: "var(--bg)",
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
                    (
                      e.currentTarget as HTMLElement
                    ).style.boxShadow = `0 8px 24px ${color}22`;
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--surface)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border)";
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg)";
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
                        fontSize: 14,
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
          </div>
        </section>

        {/* ── Privacy section ───────────────────────────────────────────── */}
        <section
          style={{
            padding: "clamp(48px, 6vw, 80px) 20px",
            background: "var(--bg)",
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
            {/* Background glow */}
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
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: "🚫", text: "No server uploads" },
                { icon: "🔒", text: "No data storage" },
                { icon: "👤", text: "No accounts" },
                { icon: "📊", text: "No analytics on files" },
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
