import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallModal } from "@/components/PwaInstallModal/PwaInstallModal";
import type { NavBarProps } from "./NavBar.types";

// Category groupings for desktop nav dividers
const TOOL_LINKS = [
  // Convert
  { path: "/ocr", label: "OCR to PDF", icon: "🔍", category: "Convert" },
  {
    path: "/searchable-pdf",
    label: "Searchable PDF OCR",
    icon: "🔎",
    category: "Convert",
  },
  { path: "/pdf-to-jpg", label: "PDF to JPG", icon: "🖼️", category: "Convert" },
  {
    path: "/pdf-to-word",
    label: "PDF to Word",
    icon: "📝",
    category: "Convert",
  },
  {
    path: "/word-to-pdf",
    label: "Word to PDF",
    icon: "📄",
    category: "Convert",
  },
  {
    path: "/pdf-to-excel",
    label: "PDF to Excel",
    icon: "📊",
    category: "Convert",
  },
  {
    path: "/excel-to-pdf",
    label: "Excel to PDF",
    icon: "📋",
    category: "Convert",
  },
  {
    path: "/html-to-pdf",
    label: "HTML to PDF",
    icon: "🌐",
    category: "Convert",
  },
  // Edit
  { path: "/edit", label: "Edit PDF", icon: "✏️", category: "Edit" },
  { path: "/sign", label: "Sign PDF", icon: "✍️", category: "Edit" },
  { path: "/watermark", label: "Add Watermark", icon: "💧", category: "Edit" },
  { path: "/split", label: "Split PDF", icon: "✂️", category: "Edit" },
  { path: "/organize", label: "Organize PDF", icon: "📑", category: "Edit" },
  // Optimize
  {
    path: "/compress",
    label: "Compress PDF",
    icon: "🗜️",
    category: "Optimize",
  },
  // Security
  { path: "/protect", label: "Protect PDF", icon: "🔐", category: "Security" },
] as const;

const CATEGORY_ORDER = ["Convert", "Edit", "Optimize", "Security"] as const;

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
  const isOnline = useAuroraStore((s) => s.isOnline);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
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

  // Scroll-aware blur
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Build desktop nav with category dividers
  const desktopNavItems: Array<
    | { type: "link"; path: string; label: string }
    | { type: "divider"; key: string }
  > = [];

  CATEGORY_ORDER.forEach((cat, catIdx) => {
    const links = TOOL_LINKS.filter((t) => t.category === cat);
    if (links.length === 0) return;
    if (catIdx > 0) {
      desktopNavItems.push({ type: "divider", key: `divider-${cat}` });
    }
    links.forEach((l) =>
      desktopNavItems.push({ type: "link", path: l.path, label: l.label }),
    );
  });

  return (
    <>
      <nav
        ref={navRef}
        className={scrolled ? "nav-scrolled" : undefined}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--surface)",
          borderBottom: `1px solid ${
            scrolled ? "var(--border-2)" : "var(--border)"
          }`,
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: scrolled ? "blur(20px)" : "blur(12px)",
          transition:
            "backdrop-filter var(--dur-normal) var(--ease-out), border-color var(--dur-normal) var(--ease-out)",
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

        {/* Desktop links — single scrollable row with category dividers */}
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
          {desktopNavItems.map((item) => {
            if (item.type === "divider") {
              return (
                <span
                  key={item.key}
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 1,
                    height: 16,
                    background: "var(--border)",
                    margin: "0 4px",
                    flexShrink: 0,
                  }}
                />
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                role="listitem"
                aria-current={currentPath === item.path ? "page" : undefined}
                style={{
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "4px 9px",
                  borderRadius: "var(--radius-sm)",
                  color:
                    currentPath === item.path
                      ? "var(--green)"
                      : "var(--text-2)",
                  background:
                    currentPath === item.path
                      ? "rgba(0,255,136,0.1)"
                      : "transparent",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop right */}
        <div
          className="nav-right-desktop"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          {/* Offline badge replaces status badge when offline */}
          {!isOnline ? (
            <span
              className="badge badge-amber"
              style={{ opacity: 1, transition: "opacity 200ms" }}
            >
              📡 Offline
            </span>
          ) : (
            <span
              className={`badge ${sc.cls}`}
              style={{ opacity: 1, transition: "opacity 200ms" }}
            >
              <span
                style={
                  status === "processing"
                    ? {
                        animation: "pulse 1.2s ease infinite",
                        display: "inline-block",
                      }
                    : undefined
                }
              >
                {sc.icon}
              </span>{" "}
              {sc.text}
            </span>
          )}
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

        {/* Hamburger — min 44×44px touch target */}
        <button
          className="hamburger-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          style={{ minWidth: 44, minHeight: 44 }}
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
          {!isOnline ? (
            <span
              className="badge badge-amber"
              style={{ alignSelf: "flex-start" }}
            >
              📡 Offline
            </span>
          ) : (
            <span
              className={`badge ${sc.cls}`}
              style={{ alignSelf: "flex-start" }}
            >
              <span
                style={
                  status === "processing"
                    ? {
                        animation: "pulse 1.2s ease infinite",
                        display: "inline-block",
                      }
                    : undefined
                }
              >
                {sc.icon}
              </span>{" "}
              {sc.text}
            </span>
          )}
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
