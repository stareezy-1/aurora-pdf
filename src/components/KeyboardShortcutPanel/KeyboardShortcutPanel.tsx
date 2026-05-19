import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

interface KeyboardShortcutPanelProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Open command palette" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Escape"], description: "Close modal / overlay" },
  { keys: ["Space"], description: "Browse files (idle state)" },
  { keys: ["Ctrl", "S"], description: "Download result (success state)" },
  { keys: ["Ctrl", "Z"], description: "Undo (editor)" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo (editor)" },
  { keys: ["Delete"], description: "Remove selected item (editor)" },
  { keys: ["←", "→"], description: "Navigate pages (OCR preview)" },
] as const;

/**
 * KeyboardShortcutPanel — focus-trapped modal overlay listing all keyboard shortcuts.
 *
 * Requirements: 7.1, 7.6
 */
export function KeyboardShortcutPanel({
  open,
  onClose,
}: KeyboardShortcutPanelProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Save previous focus and focus dialog when opened
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      const id = requestAnimationFrame(() => {
        dialogRef.current?.focus();
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

  // Handle Escape key and focus trap
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: keep Tab within the dialog
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,5,5,0.75)",
        backdropFilter: "blur(8px)",
      }}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        className="modal-enter"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "32px",
          width: "min(640px, 92vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
          outline: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            ✕
          </button>
        </div>

        {/* Two-column grid of shortcut rows */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px 24px",
          }}
        >
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--surface-2)",
                borderRadius: "var(--radius-md)",
                gap: 12,
              }}
            >
              {/* Key badges */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 6px",
                      background: "var(--surface-3)",
                      border: "1px solid var(--border-2)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      color: "var(--text)",
                      minWidth: 24,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
              {/* Description */}
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-2)",
                  textAlign: "right",
                  lineHeight: 1.4,
                }}
              >
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
