import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  getLanguagePackMetadata,
  deleteLanguagePack,
  type LanguagePackRecord,
} from "@/lib/language-pack-db";

interface LanguagePackManagerProps {
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Modal listing all cached language packs with delete capability.
 * Portal-rendered into document.body.
 *
 * Requirements: 22.5, 22.6
 */
export function LanguagePackManager({
  open,
  onClose,
}: LanguagePackManagerProps) {
  const [packs, setPacks] = useState<LanguagePackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getLanguagePackMetadata()
      .then(setPacks)
      .catch(() => setPacks([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleDelete = async (code: string) => {
    setDeletingCode(code);
    try {
      await deleteLanguagePack(code);
      setPacks((prev) => prev.filter((p) => p.code !== code));
    } catch {
      // Silently ignore delete errors
    } finally {
      setDeletingCode(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Language pack manager"
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className="modal-enter"
        style={{
          position: "relative",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: 24,
          width: "100%",
          maxWidth: 520,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
            }}
          >
            🌐 Language Packs
          </h2>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            aria-label="Close language pack manager"
            style={{ padding: "4px 10px", fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Manage locally cached Tesseract language models. Deleting a pack will
          require re-downloading it on next use.
        </p>

        {/* Pack list */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              Loading…
            </div>
          ) : packs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              No language packs cached yet.
            </div>
          ) : (
            packs.map((pack) => (
              <div
                key={pack.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {pack.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {formatBytes(pack.size)} · Cached{" "}
                    {formatDate(pack.cachedAt)}
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(pack.code)}
                  disabled={deletingCode === pack.code}
                  aria-label={`Delete ${pack.name} language pack`}
                  style={{ flexShrink: 0, fontSize: 13 }}
                >
                  {deletingCode === pack.code ? "Deleting…" : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
