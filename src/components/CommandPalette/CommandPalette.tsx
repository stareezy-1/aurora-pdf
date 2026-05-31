import { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router";
import { styles } from "./CommandPalette.style";
import { TOOL_REGISTRY } from "@/lib/tool-registry";
import type { CommandPaletteProps } from "./CommandPalette.types";

// Build the flat tool list from the registry — single source of truth
const TOOLS = TOOL_REGISTRY.map((t) => ({
  path: t.path,
  label: t.name,
  category: t.category,
  icon: t.icon,
  description: t.description,
  keywords: t.keywords ?? [],
}));

// Human-readable category labels
const CATEGORY_LABELS: Record<string, string> = {
  "convert-to": "Convert to PDF",
  "convert-from": "Convert from PDF",
  edit: "Edit",
  organize: "Organize",
  optimize: "Optimize",
  secure: "Secure",
};

const CATEGORY_COLORS: Record<string, string> = {
  "convert-to": "#00ff88",
  "convert-from": "#f59e0b",
  edit: "#00ccff",
  organize: "#f59e0b",
  optimize: "#4ade80",
  secure: "#7c3aed",
};

/**
 * Highlight the matched substring in a label.
 */
export function highlightMatch(label: string, query: string): React.ReactNode {
  if (!query) return label;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className={styles.mark}>
        {label.slice(idx, idx + query.length)}
      </mark>
      {label.slice(idx + query.length)}
    </>
  );
}

/**
 * Pure filter — searches label, description, and keywords.
 * Exported for testing.
 */
export function filterTools(tools: typeof TOOLS, query: string): typeof TOOLS {
  if (!query) return tools;
  const q = query.toLowerCase();
  return tools.filter(
    (t) =>
      t.label.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q)),
  );
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  const filtered = filterTools(TOOLS, query);
  const safeActiveIndex =
    filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : 0;

  // Save previous focus and focus input when opened
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Restore focus on close
  useEffect(() => {
    if (!open && previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list
      .querySelector(`[data-index="${safeActiveIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex]);

  const handleNavigate = useCallback(
    (path: string) => {
      void navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) =>
            filtered.length === 0 ? 0 : (i + 1) % filtered.length,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) =>
            filtered.length === 0
              ? 0
              : (i - 1 + filtered.length) % filtered.length,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[safeActiveIndex])
            handleNavigate(filtered[safeActiveIndex].path);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          break;
      }
    },
    [filtered, safeActiveIndex, handleNavigate, onClose],
  );

  if (!open) return null;

  const activeOptionId = filtered[safeActiveIndex]
    ? `cp-option-${safeActiveIndex}`
    : undefined;

  const content = (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 16,
              fontSize: 16,
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={`Search ${TOOLS.length} tools…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            aria-label="Search tools"
            aria-autocomplete="list"
            aria-controls="cp-listbox"
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            spellCheck={false}
            style={{ paddingLeft: 44 }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: 16,
                padding: 4,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Results count */}
        {query && (
          <div
            style={{
              padding: "6px 16px 0",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {filtered.length === 0
              ? "No results"
              : `${filtered.length} tool${
                  filtered.length !== 1 ? "s" : ""
                } found`}
          </div>
        )}

        {/* Tool list */}
        <ul
          id="cp-listbox"
          ref={listRef}
          className={styles.list}
          role="listbox"
          aria-label="Tools"
        >
          {filtered.map((tool, i) => {
            const isActive = i === safeActiveIndex;
            const catColor =
              CATEGORY_COLORS[tool.category] ?? "var(--text-muted)";
            const catLabel = CATEGORY_LABELS[tool.category] ?? tool.category;
            return (
              <li
                key={tool.path}
                id={`cp-option-${i}`}
                data-index={i}
                className={`${styles.item}${
                  isActive ? ` ${styles.itemActive}` : ""
                }`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleNavigate(tool.path);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {tool.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className={styles.itemLabel}>
                    {highlightMatch(tool.label, query)}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tool.description}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: catColor,
                    background: `${catColor}18`,
                    padding: "2px 7px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {catLabel}
                </span>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className={styles.item} role="option" aria-selected={false}>
              <span
                className={styles.itemLabel}
                style={{ color: "var(--text-muted)" }}
              >
                No tools match "{query}"
              </span>
            </li>
          )}
        </ul>

        {/* Footer hint */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <span>
            <kbd
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 10,
              }}
            >
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 10,
              }}
            >
              ↵
            </kbd>{" "}
            open
          </span>
          <span>
            <kbd
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: 10,
              }}
            >
              Esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
