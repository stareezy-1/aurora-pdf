import { useEffect, useState, useRef } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { OcrSplitPreview } from "@/components/OcrSplitPreview/OcrSplitPreview";
import { useSearchablePdfOcr } from "./hooks/useSearchablePdfOcr";
import { getSupportedLanguages } from "@/engines/ocr-engine";
import type { OcrSplitPreviewPage } from "@/components/OcrSplitPreview/OcrSplitPreview.types";

interface OcrWorkspacePageProps {
  file: File;
  onReset: () => void;
}

/** Related tools from the Convert category (excluding searchable-pdf) */
const RELATED_TOOLS = [
  { path: "/ocr", label: "OCR to PDF", icon: "🔍" },
  { path: "/pdf-to-word", label: "PDF to Word", icon: "📝" },
  { path: "/pdf-to-jpg", label: "PDF to JPG", icon: "🖼️" },
];

/** Returns confidence badge color class */
function confidenceColor(confidence: number): string {
  if (confidence >= 80) return "var(--green)";
  if (confidence >= 50) return "var(--amber, #f59e0b)";
  return "var(--red, #ef4444)";
}

/** Returns confidence label */
function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return "High";
  if (confidence >= 50) return "Medium";
  return "Low";
}

/**
 * OCR workspace — processing phase and review phase.
 *
 * Requirements: 18.1–18.8, 19.3–19.6, 21.1–21.7
 */
export function OcrWorkspacePage({ file, onReset }: OcrWorkspacePageProps) {
  const ocr = useSearchablePdfOcr();
  const languages = getSupportedLanguages();
  const [selectedLanguage] = useState("eng");
  const [previewPage, setPreviewPage] = useState(0);
  const [exportFormat, setExportFormat] = useState<"pdf" | "txt">("pdf");
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [announced, setAnnounced] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);

  // Start OCR on mount
  useEffect(() => {
    ocr.start(file, selectedLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Announce transition to review phase
  useEffect(() => {
    if (ocr.phase === "review" && !announced) {
      setAnnounced(true);
      if (liveRef.current) {
        liveRef.current.textContent =
          "OCR complete. Review your document before exporting.";
      }
    }
  }, [ocr.phase, announced]);

  // Build blob URL when result bytes are available
  useEffect(() => {
    if (ocr.resultBytes) {
      // Copy to a plain ArrayBuffer to satisfy Blob constructor type constraints
      const copy = new Uint8Array(ocr.resultBytes).buffer as ArrayBuffer;
      const blob = new Blob([copy], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [ocr.resultBytes]);

  // Build preview pages for OcrSplitPreview
  const previewPages: OcrSplitPreviewPage[] = ocr.pages
    .filter((p) => p.status === "done" && p.thumbnailDataUrl)
    .map((p) => ({
      pageIndex: p.pageIndex,
      imageDataUrl: p.thumbnailDataUrl!,
      imageWidth: 0, // will be overridden by actual image dimensions
      imageHeight: 0,
      words: [],
    }));

  // Compute summary stats
  const donePages = ocr.pages.filter((p) => p.status === "done");
  const avgConfidence =
    donePages.length > 0
      ? Math.round(
          donePages.reduce((sum, p) => sum + (p.confidence ?? 0), 0) /
            donePages.length,
        )
      : 0;

  const isProcessing =
    ocr.phase === "rendering" ||
    ocr.phase === "ocr" ||
    ocr.phase === "assembling";

  const isReview = ocr.phase === "review";

  // Build output filename
  const baseName = file.name.replace(/\.pdf$/i, "");
  const outputFilename =
    exportFormat === "pdf"
      ? `${baseName}-searchable.pdf`
      : `${baseName}-text.txt`;

  // Handle download
  const handleDownload = () => {
    let blob: Blob;
    if (exportFormat === "pdf" && ocr.resultBytes) {
      // Copy to plain ArrayBuffer to satisfy Blob constructor type constraints
      const copy = new Uint8Array(ocr.resultBytes).buffer as ArrayBuffer;
      blob = new Blob([copy], { type: "application/pdf" });
    } else {
      blob = new Blob([ocr.resultText], { type: "text/plain" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outputFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolLayout toolName="Searchable PDF OCR">
      {/* Hidden aria-live region for OCR completion announcement */}
      <div
        ref={liveRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />

      {/* ── Processing phase ── */}
      {isProcessing && (
        <div>
          {/* Header */}
          <div className="tool-header">
            <h1>🔎 Searchable PDF OCR</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {file.name} · {ocr.totalPages} page
              {ocr.totalPages !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Phase label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--green)",
                animation: "pulse 1.2s ease infinite",
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
            >
              {ocr.phase === "rendering" && "Rendering pages…"}
              {ocr.phase === "ocr" && "Running OCR…"}
              {ocr.phase === "assembling" && "Assembling searchable PDF…"}
            </span>
            {ocr.estimatedSecondsRemaining > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                ~{ocr.estimatedSecondsRemaining}s remaining
              </span>
            )}
          </div>

          {/* Per-page progress cards */}
          <div
            aria-live="polite"
            aria-label="OCR progress"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
            className="ocr-progress-grid"
          >
            {ocr.pages.map((page) => (
              <div
                key={page.pageIndex}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 14px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  alignItems: "flex-start",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 48,
                    height: 64,
                    flexShrink: 0,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {page.thumbnailDataUrl ? (
                    <img
                      src={page.thumbnailDataUrl}
                      alt={`Page ${page.pageIndex + 1} thumbnail`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 18, color: "var(--text-muted)" }}>
                      📄
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    Page {page.pageIndex + 1}
                  </div>

                  {/* Status badge */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background:
                          page.status === "done"
                            ? "rgba(0,255,136,0.15)"
                            : page.status === "error"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(245,158,11,0.15)",
                        color:
                          page.status === "done"
                            ? "var(--green)"
                            : page.status === "error"
                            ? "var(--red, #ef4444)"
                            : "var(--amber, #f59e0b)",
                        fontWeight: 600,
                      }}
                    >
                      {page.status === "pending" && "Pending"}
                      {page.status === "rendering" && "Rendering…"}
                      {page.status === "ocr" && "OCR…"}
                      {page.status === "done" && "Done"}
                      {page.status === "error" && "Error"}
                    </span>

                    {/* Confidence badge */}
                    {page.status === "done" &&
                      page.confidence !== undefined && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: `${confidenceColor(page.confidence)}22`,
                            color: confidenceColor(page.confidence),
                            fontWeight: 600,
                          }}
                        >
                          {confidenceLabel(page.confidence)} ({page.confidence}
                          %)
                        </span>
                      )}
                  </div>

                  {/* Language label */}
                  {page.language && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {languages.find((l) => l.code === page.language)?.label ??
                        page.language}
                    </div>
                  )}

                  {/* ETA */}
                  {page.estimatedSecondsRemaining !== undefined &&
                    page.status !== "done" && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        ~{page.estimatedSecondsRemaining}s
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Cancel button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                ocr.cancel();
                onReset();
              }}
              aria-label="Cancel OCR processing"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Review phase ── */}
      {isReview && (
        <div>
          <div className="tool-header">
            <h1>🔎 Review OCR Results</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {file.name} · {ocr.totalPages} page
              {ocr.totalPages !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Summary panel */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}
            className="ocr-summary-grid"
          >
            <div
              style={{
                padding: "14px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--green)",
                }}
              >
                {ocr.totalPages}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Pages
              </div>
            </div>
            <div
              style={{
                padding: "14px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: confidenceColor(avgConfidence),
                }}
              >
                {avgConfidence}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Avg. Confidence
              </div>
            </div>
            <div
              style={{
                padding: "14px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {ocr.resultText.split(/\s+/).filter(Boolean).length}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Words
              </div>
            </div>
          </div>

          {/* Low-confidence warning */}
          {avgConfidence < 60 && avgConfidence > 0 && (
            <div
              className="alert alert-warning"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              ⚠ Average confidence is {avgConfidence}% — some text may be
              inaccurate. Consider using a higher-quality scan or a different
              language setting.
            </div>
          )}

          {/* Split preview */}
          {previewPages.length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 20,
                marginBottom: 20,
              }}
            >
              <OcrSplitPreview
                pages={previewPages}
                currentPage={previewPage}
                onPageChange={setPreviewPage}
              />
            </div>
          )}

          {/* Export options */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 12,
              }}
            >
              Export Format
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text)",
                }}
              >
                <input
                  type="radio"
                  name="export-format"
                  value="pdf"
                  checked={exportFormat === "pdf"}
                  onChange={() => setExportFormat("pdf")}
                  style={{ accentColor: "var(--green)" }}
                />
                📄 Searchable PDF
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  color: "var(--text)",
                }}
              >
                <input
                  type="radio"
                  name="export-format"
                  value="txt"
                  checked={exportFormat === "txt"}
                  onChange={() => setExportFormat("txt")}
                  style={{ accentColor: "var(--green)" }}
                />
                📝 Plain Text
              </label>
            </div>
          </div>

          {/* Download button */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <button
              className="btn btn-primary btn-lg"
              onClick={handleDownload}
              aria-label={`Download ${outputFilename}`}
            >
              ⬇ Download {outputFilename}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onReset}
              aria-label="Process another file"
            >
              ↩ Process Another
            </button>
          </div>

          {/* Privacy shield with related tools */}
          <PrivacyShield
            variant="card"
            status="success"
            outputFilename={outputFilename}
            outputSizeBytes={ocr.resultBytes?.byteLength}
            blobUrl={
              exportFormat === "pdf" && resultBlobUrl
                ? resultBlobUrl
                : undefined
            }
            onReset={onReset}
            relatedTools={RELATED_TOOLS}
          />
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .ocr-progress-grid {
            grid-template-columns: 1fr !important;
          }
          .ocr-summary-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </ToolLayout>
  );
}
