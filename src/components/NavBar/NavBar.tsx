import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallModal } from "@/components/PwaInstallModal/PwaInstallModal";
import type { NavBarProps } from "./NavBar.types";

const TOOL_LINKS = [
  { path: "/compress", label: "Compress PDF", icon: "🗜️" },
  { path: "/ocr", label: "OCR to PDF", icon: "🔍" },
  { path: "/pdf-to-jpg", label: "PDF to JPG", icon: "🖼️" },
  { path: "/pdf-to-word", label: "PDF to Word", icon: "📝" },
  { path: "/word-to-pdf", label: "Word to PDF", icon: "📄" },
  { path: "/pdf-to-excel", label: "PDF to Excel", icon: "📊" },
  { path: "/excel-to-pdf", label: "Excel to PDF", icon: "📋" },
  { path: "/edit", label: "Edit PDF", icon: "✏️" },
  { path: "/sign", label: "Sign PDF", icon: "✍️" },
  { path: "/watermark", label: "Add Watermark", icon: "💧" },
  { path: "/split", label: "Split PDF", icon: "✂️" },
  { path: "/html-to-pdf", label: "HTML to PDF", icon: "🌐" },
  { path: "/organize", label: "Organize PDF", icon: "📑" },
  { path: "/protect", label: "Protect PDF", icon: "🔐" },
];

const STATUS_CONFIG = {
  idle: { icon: "🛡", text: "Local Mode", cls: "badge-green" },
  processing: { icon: "⚡", text: "Processing…", cls: "badge-amber" },
  success: { icon: "✓", text: "Local Mode", cls: "badge-green" },
  error: { icon: "⚠", text: "Error", cls: "badge-red" },
};

export function NavBar({ currentPath }: NavBarProps) {
  const status = useAuroraStore((s) => s.status);
  const theme = useAuroraStore((s) => s.theme);
  const toggleTheme = useAuroraStore((s) => s.toggleTheme);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const sc = STATUS_CONFIG[status];
  const pwa = usePwaInstall();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(12px)",
        }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          aria-label="AuroraPDF home"
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              background:
                "linear-gradient(135deg, var(--green), var(--purple))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Aurora
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
            PDF
          </span>
        </Link>

        {/* Desktop links — single scrollable row */}
        <div
          className="desktop-nav"
          style={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "nowrap",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            flex: 1,
            margin: "0 12px",
          }}
          role="list"
        >
          {TOOL_LINKS.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              role="listitem"
              aria-current={currentPath === path ? "page" : undefined}
              style={{
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 9px",
                borderRadius: "var(--radius-sm)",
                color: currentPath === path ? "var(--green)" : "var(--text-2)",
                background:
                  currentPath === path ? "rgba(0,255,136,0.1)" : "transparent",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop right */}
        <div
          className="nav-right-desktop"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span className={`badge ${sc.cls}`}>
            {sc.icon} {sc.text}
          </span>
          {pwa.state === "available" && (
            <button
              onClick={pwa.openModal}
              aria-label="Install AuroraPDF app"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(0,255,136,0.1)",
                border: "1px solid rgba(0,255,136,0.3)",
                color: "var(--green)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              ⬇ Install
            </button>
          )}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === "dark" ? "light" : "dark"
            } theme`}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Hamburger */}
        <button
          className="hamburger-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
        >
          ☰
        </button>
      </nav>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="nav-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`nav-drawer${drawerOpen ? " open" : ""}`}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
      >
        <div className="nav-drawer-header">
          <Link
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                background:
                  "linear-gradient(135deg, var(--green), var(--purple))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Aurora
            </span>
            <span
              style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}
            >
              PDF
            </span>
          </Link>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              cursor: "pointer",
              color: "var(--text)",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div className="nav-drawer-links" role="list">
          {TOOL_LINKS.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              role="listitem"
              className={`nav-drawer-link${
                currentPath === path ? " active" : ""
              }`}
              aria-current={currentPath === path ? "page" : undefined}
            >
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </div>

        <div className="nav-drawer-footer">
          <span
            className={`badge ${sc.cls}`}
            style={{ alignSelf: "flex-start" }}
          >
            {sc.icon} {sc.text}
          </span>
          {pwa.state === "available" && (
            <button
              onClick={() => {
                setDrawerOpen(false);
                pwa.openModal();
              }}
              aria-label="Install AuroraPDF app"
              className="btn"
              style={{
                width: "100%",
                background: "rgba(0,255,136,0.1)",
                border: "1px solid rgba(0,255,136,0.3)",
                color: "var(--green)",
                fontWeight: 600,
              }}
            >
              ⬇ Install AuroraPDF App
            </button>
          )}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === "dark" ? "light" : "dark"
            } theme`}
            className="btn btn-secondary"
            style={{ width: "100%" }}
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>

      {/* PWA Install Modal */}
      {pwa.showModal && (
        <PwaInstallModal
          state={pwa.state}
          onInstall={pwa.install}
          onDismiss={pwa.dismiss}
        />
      )}
    </>
  );
}
