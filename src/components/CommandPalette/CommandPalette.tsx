import { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router";
import { styles } from "./CommandPalette.style";
import type { CommandPaletteProps } from "./CommandPalette.types";

const TOOLS = [
  {
    path: "/compress",
    label: "Compress PDF",
    category: "Optimize",
    icon: "🗜️",
  },
  { path: "/ocr", label: "OCR to PDF", category: "Convert", icon: "🔍" },
  {
    path: "/searchable-pdf",
    label: "Searchable PDF OCR",
    category: "Convert",
    icon: "🔎",
  },
  { path: "/pdf-to-jpg", label: "PDF to JPG", category: "Convert", icon: "🖼️" },
  {
    path: "/pdf-to-word",
    label: "PDF to Word",
    category: "Convert",
    icon: "📝",
  },
  {
    path: "/word-to-pdf",
    label: "Word to PDF",
    category: "Convert",
    icon: "📄",
  },
  {
    path: "/pdf-to-excel",
    label: "PDF to Excel",
    category: "Convert",
    icon: "📊",
  },
  {
    path: "/excel-to-pdf",
    label: "Excel to PDF",
    category: "Convert",
    icon: "📋",
  },
  { path: "/edit", label: "Edit PDF", category: "Edit", icon: "✏️" },
  { path: "/sign", label: "Sign PDF", category: "Edit", icon: "✍️" },
  { path: "/watermark", label: "Add Watermark", category: "Edit", icon: "💧" },
  { path: "/split", label: "Split PDF", category: "Edit", icon: "✂️" },
  { path: "/organize", label: "Organize PDF", category: "Edit", icon: "📑" },
  {
    path: "/html-to-pdf",
    label: "HTML to PDF",
    category: "Convert",
    icon: "🌐",
  },
  { path: "/protect", label: "Protect PDF", category: "Security", icon: "🔐" },
] as const;

/**
 * Highlight the matched substring in a label.
 * Returns an array of React nodes with the match wrapped in <mark>.
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
 * Pure filter function — exported so it can be tested independently.
 * Returns tools whose label contains the query (case-insensitive substring match).
 */
export function filterTools(
  tools: ReadonlyArray<{
    path: string;
    label: string;
    category: string;
    icon: string;
  }>,
  query: string,
): ReadonlyArray<{
  path: string;
  label: string;
  category: string;
  icon: string;
}> {
  if (!query) return tools;
  const q = query.toLowerCase();
  return tools.filter((t) => t.label.toLowerCase().includes(q));
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  const filtered = filterTools(TOOLS, query);

  // Clamp activeIndex when filtered list shrinks
  const safeActiveIndex =
    filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : 0;

  // Save previous focus and focus input when opened
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      // Defer so the portal has rendered
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
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
    const activeItem = list.querySelector(`[data-index="${safeActiveIndex}"]`);
    activeItem?.scrollIntoView({ block: "nearest" });
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
          if (filtered[safeActiveIndex]) {
            handleNavigate(filtered[safeActiveIndex].path);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          // Focus trap: keep Tab within the dialog
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
        // Close when clicking the backdrop (not the overlay)
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
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="Search tools…"
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
        />
        <ul
          id="cp-listbox"
          ref={listRef}
          className={styles.list}
          role="listbox"
          aria-label="Tools"
        >
          {filtered.map((tool, i) => {
            const isActive = i === safeActiveIndex;
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
                  e.preventDefault(); // prevent input blur
                  handleNavigate(tool.path);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {tool.icon}
                </span>
                <span className={styles.itemLabel}>
                  {highlightMatch(tool.label, query)}
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
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
