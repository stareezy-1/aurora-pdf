import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallModal } from "@/components/PwaInstallModal/PwaInstallModal";
import type { NavItem } from "@/types/site.types";
import type { NavBarProps } from "./NavBar.types";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Contact", href: "https://stareezy.tech", external: true },
  {
    label: "GitHub",
    href: "https://github.com/stareezy-1/aurora-pdf",
    external: true,
    variant: "button",
  },
];

const STATUS_CONFIG = {
  idle: { icon: "🛡", text: "Local Mode", cls: "badge-green" },
  processing: { icon: "⚡", text: "Processing…", cls: "badge-amber" },
  success: { icon: "✓", text: "Local Mode", cls: "badge-green" },
  error: { icon: "⚠", text: "Error", cls: "badge-red" },
};

// GitHub SVG mark icon
function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function NavBar({ currentPath }: NavBarProps) {
  const status = useAuroraStore((s) => s.status);
  const theme = useAuroraStore((s) => s.theme);
  const toggleTheme = useAuroraStore((s) => s.toggleTheme);
  const isOnline = useAuroraStore((s) => s.isOnline);
  const openCommandPalette = useAuroraStore((s) => s.openCommandPalette);
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

  // Active link detection: match internal `to` against current pathname
  function isActive(item: NavItem): boolean {
    if (!item.to) return false;
    if (item.to === "/") return location.pathname === "/";
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(item.to + "/")
    );
  }

  function renderNavItem(item: NavItem, compact = false) {
    const active = isActive(item);

    // GitHub button variant — outlined badge with icon
    if (item.variant === "button") {
      return (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View AuroraPDF on GitHub (opens in new tab)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: compact ? "7px 14px" : "5px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontSize: compact ? 14 : 12,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.15s",
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--text-2)";
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
          }}
        >
          <GitHubIcon />
          GitHub
        </a>
      );
    }

    // External link (non-button)
    if (item.external && item.href) {
      return (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: "none",
            fontSize: compact ? 14 : 13,
            fontWeight: 500,
            padding: compact ? "8px 12px" : "5px 12px",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-2)",
            background: "transparent",
            transition: "all 0.15s",
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
            (e.currentTarget as HTMLElement).style.background =
              "var(--surface-2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {item.label}
        </a>
      );
    }

    // Internal link
    return (
      <Link
        key={item.label}
        to={item.to!}
        aria-current={active ? "page" : undefined}
        style={{
          textDecoration: "none",
          fontSize: compact ? 14 : 13,
          fontWeight: active ? 700 : 500,
          padding: compact ? "8px 12px" : "5px 12px",
          borderRadius: "var(--radius-sm)",
          color: active ? "var(--green)" : "var(--text-2)",
          background: active ? "rgba(0,255,136,0.1)" : "transparent",
          transition: "all 0.15s",
          whiteSpace: "nowrap" as const,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "var(--text)";
            (e.currentTarget as HTMLElement).style.background =
              "var(--surface-2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {item.label}
      </Link>
    );
  }

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
            flexShrink: 0,
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

        {/* Desktop nav links — centered */}
        <div
          className="desktop-nav"
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
            margin: "0 16px",
          }}
          role="list"
        >
          {NAV_ITEMS.map((item) => (
            <div key={item.label} role="listitem">
              {renderNavItem(item)}
            </div>
          ))}
        </div>

        {/* Desktop right — search, theme toggle, install, status badge */}
        <div
          className="nav-right-desktop"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {/* Search / Command Palette button */}
          <button
            onClick={openCommandPalette}
            aria-label="Search tools (⌘K)"
            title="Search tools (⌘K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border-2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
          >
            <span style={{ fontSize: 13 }}>🔍</span>
            <span>Search {TOOL_REGISTRY.length} tools</span>
            <kbd
              style={{
                background: "var(--surface-3, var(--bg))",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "inherit",
              }}
            >
              ⌘K
            </kbd>
          </button>
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

        {/* Drawer nav links */}
        <div
          className="nav-drawer-links"
          role="list"
          style={{ padding: "8px 0" }}
        >
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              role="listitem"
              style={{ padding: "2px 16px" }}
            >
              {renderNavItem(item, true)}
            </div>
          ))}
        </div>

        {/* Mobile search button */}
        <div style={{ padding: "8px 16px" }}>
          <button
            onClick={() => {
              setDrawerOpen(false);
              openCommandPalette();
            }}
            aria-label="Search tools"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
              fontFamily: "var(--font)",
            }}
          >
            <span style={{ fontSize: 16 }}>🔍</span>
            <span style={{ flex: 1 }}>
              Search {TOOL_REGISTRY.length} tools…
            </span>
            <kbd
              style={{
                background: "var(--surface-3, var(--bg))",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "inherit",
              }}
            >
              ⌘K
            </kbd>
          </button>
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
