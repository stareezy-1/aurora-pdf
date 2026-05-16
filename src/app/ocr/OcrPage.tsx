import { useRef } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { DownloadButton } from "@/components/DownloadButton/DownloadButton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useOcr } from "./hooks/useOcr";

const IMAGE_ACCEPT = [
  { mime: "image/jpeg", extension: ".jpg" },
  { mime: "image/jpeg", extension: ".jpeg" },
  { mime: "image/png", extension: ".png" },
  { mime: "image/tiff", extension: ".tiff" },
  { mime: "image/bmp", extension: ".bmp" },
  { mime: "image/webp", extension: ".webp" },
];

export default function OcrPage() {
  usePageTitle("OCR: Images to PDF");
  const vm = useOcr();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  function handleSelectAll() {
    textAreaRef.current?.select();
  }

  return (
    <ToolLayout toolName="OCR: Images to PDF">
      <div className="tool-header">
        <h1>🔍 OCR: Images to PDF</h1>
        <p>
          Extract text from images and create a searchable PDF. Images are
          pre-processed for maximum accuracy.
        </p>
      </div>

      {/* ── Upload & run ── */}
      {vm.status === "idle" && (
        <>
          {vm.files.length === 0 ? (
            <FileDropZone
              accept={IMAGE_ACCEPT}
              multiple
              onFilesAccepted={vm.handleFilesAccepted}
              onError={(msg) => useAuroraStore.getState().failSession(msg)}
              aria-label="Drop image files for OCR"
            />
          ) : (
            <>
              {/* Full-width image previews */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                {vm.imagePreviews.map((src, i) => (
                  <div key={i} className="preview-panel">
                    <div
                      className="preview-panel-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>🖼️ {vm.files[i]?.name ?? `Image ${i + 1}`}</span>
                      <span
                        style={{ color: "var(--text-muted)", fontSize: 11 }}
                      >
                        {vm.files[i]
                          ? `${(vm.files[i].size / 1024).toFixed(0)} KB`
                          : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: 0,
                        background: "#111",
                        display: "flex",
                        justifyContent: "center",
                        minHeight: 120,
                      }}
                    >
                      <img
                        src={src}
                        alt={`Image ${i + 1}`}
                        style={{
                          width: "100%",
                          maxHeight: 600,
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "flex-end",
                  marginBottom: 20,
                }}
              >
                <div>
                  <label className="label" htmlFor="ocr-lang">
                    OCR Language
                  </label>
                  <select
                    id="ocr-lang"
                    className="select-field"
                    value={vm.language}
                    onChange={(e) => vm.setLanguage(e.target.value)}
                    aria-label="Select OCR language"
                    style={{ minWidth: 200 }}
                  >
                    {vm.languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={vm.handleRun}
                    aria-label="Run OCR"
                  >
                    🔍 Run OCR on {vm.files.length} image
                    {vm.files.length !== 1 ? "s" : ""}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={vm.handleReset}
                    aria-label="Clear images"
                  >
                    ✕ Clear
                  </button>
                </div>
              </div>

              <div className="alert alert-info" style={{ fontSize: 12 }}>
                💡 Images are automatically upscaled and contrast-enhanced
                before OCR for better text extraction accuracy.
              </div>
            </>
          )}
        </>
      )}

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={vm.handleReset}
      />

      {/* ── Success: PDF preview + text + download ── */}
      {vm.status === "success" && (
        <div
          className="fade-in"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 8,
          }}
        >
          {vm.blankPages.length > 0 && (
            <div className="alert alert-warning">
              ⚠ No text detected in: {vm.blankPages.join(", ")}. Blank pages
              were inserted.
            </div>
          )}

          {/* PDF page previews */}
          {vm.pdfPreviews.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  📄 Generated PDF Preview
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  ({vm.pdfPreviews.length} page
                  {vm.pdfPreviews.length !== 1 ? "s" : ""} shown)
                </span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {vm.pdfPreviews.map((src, i) => (
                  <div key={i} className="preview-panel">
                    <div className="preview-panel-header">Page {i + 1}</div>
                    <div
                      style={{
                        background: "#fff",
                        display: "flex",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <img
                        src={src}
                        alt={`PDF page ${i + 1}`}
                        style={{ width: "100%", display: "block" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted text — selectable, copyable */}
          {vm.extractedText && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    📝 Extracted Text
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {vm.extractedText.length.toLocaleString()} characters
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleSelectAll}
                    aria-label="Select all text"
                  >
                    ⬜ Select All
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={vm.handleCopyText}
                    aria-label="Copy all text to clipboard"
                    style={{
                      background: vm.copied
                        ? "rgba(0,255,136,0.15)"
                        : "var(--surface-3)",
                      color: vm.copied ? "var(--green)" : "var(--text)",
                      border: `1px solid ${vm.copied ? "var(--green)" : "var(--border)"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    {vm.copied ? "✓ Copied!" : "📋 Copy All"}
                  </button>
                </div>
              </div>

              {/* Selectable text area */}
              <textarea
                ref={textAreaRef}
                readOnly
                value={vm.extractedText}
                aria-label="Extracted text content"
                style={{
                  width: "100%",
                  minHeight: 280,
                  maxHeight: 520,
                  padding: "16px",
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  cursor: "text",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                }}
                onClick={(e) => e.currentTarget.focus()}
              />
            </div>
          )}

          {/* Download + reset */}
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--green)",
                marginBottom: 4,
              }}
            >
              Processed Locally — Zero Upload
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 20,
              }}
            >
              Your file never left your device.
            </p>
            {vm.resultBlobUrl && vm.outputFilename && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <DownloadButton
                  blobUrl={vm.resultBlobUrl}
                  filename={vm.outputFilename}
                  onDownloadComplete={vm.clearWorkbox}
                />
                <button
                  className="btn btn-secondary"
                  onClick={vm.handleReset}
                  aria-label="Process another file"
                >
                  ↩ Process Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
