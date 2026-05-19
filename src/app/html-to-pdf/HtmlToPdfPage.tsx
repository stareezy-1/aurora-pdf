import { useState } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { OfflineBanner } from "@/components/OfflineBanner/OfflineBanner";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useHtmlToPdf } from "./hooks/useHtmlToPdf";
import type { PageSize, Orientation } from "@/types/tool.types";

const PAGE_SIZES: PageSize[] = ["A4", "Letter", "Legal"];
const ORIENTATIONS: { value: Orientation; label: string; icon: string }[] = [
  { value: "portrait", label: "Portrait", icon: "📄" },
  { value: "landscape", label: "Landscape", icon: "🖼️" },
];

export default function HtmlToPdfPage() {
  usePageTitle("HTML to PDF");
  const vm = useHtmlToPdf();
  const isOnline = useAuroraStore((s) => s.isOnline);
  const busy = vm.isPending || vm.status === "processing";

  // Input mode: 'url' or 'file'
  const [inputMode, setInputMode] = useState<"url" | "file">("url");
  // Preview URL — set on blur or Enter, cleared on reset
  const [previewUrl, setPreviewUrl] = useState("");

  const urlDisabled = !isOnline && inputMode === "url";
  const canConvert = !!vm.url && !vm.urlError && !busy && !urlDisabled;

  function handleUrlBlur() {
    if (vm.url && !vm.urlError) setPreviewUrl(vm.url);
  }

  function handleUrlKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (vm.url && !vm.urlError) setPreviewUrl(vm.url);
      if (canConvert) vm.handleConvert();
    }
  }

  function handleReset() {
    vm.handleReset();
    setPreviewUrl("");
  }

  return (
    <ToolLayout toolName="HTML to PDF">
      <div className="tool-header">
        <h1>🌐 HTML to PDF</h1>
        <p>
          Convert any public webpage to a PDF — rendered entirely in your
          browser.
        </p>
      </div>

      {/* ── Input mode tabs ── */}
      <div className="tab-group" role="tablist" aria-label="Input mode">
        <button
          className={`tab-btn${inputMode === "url" ? " active" : ""}`}
          role="tab"
          aria-selected={inputMode === "url"}
          onClick={() => setInputMode("url")}
        >
          🔗 URL
        </button>
        <button
          className={`tab-btn${inputMode === "file" ? " active" : ""}`}
          role="tab"
          aria-selected={inputMode === "file"}
          onClick={() => setInputMode("file")}
        >
          📄 File
        </button>
      </div>

      {/* ── Offline banner ── */}
      <OfflineBanner mode={inputMode} />

      {/* ── URL card ── */}
      {inputMode === "url" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <label
            htmlFor="html-url-input"
            style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}
          >
            🔗 Webpage URL
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              id="html-url-input"
              type="url"
              className="input-field"
              placeholder="https://example.com"
              value={vm.url}
              onChange={(e) => vm.setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              onKeyDown={handleUrlKeyDown}
              aria-label="Enter an HTTPS URL to convert to PDF"
              aria-invalid={!!vm.urlError}
              disabled={busy || urlDisabled}
              style={{
                flex: 1,
                fontSize: 15,
                opacity: urlDisabled ? 0.5 : 1,
                cursor: urlDisabled ? "not-allowed" : undefined,
              }}
            />
            <button
              className="btn btn-primary"
              onClick={vm.handleConvert}
              disabled={!canConvert}
              aria-label="Convert to PDF"
              style={{ flexShrink: 0, minWidth: 130 }}
            >
              {busy ? "Converting…" : "🌐 Convert"}
            </button>
          </div>
          {vm.urlError && (
            <div
              role="alert"
              style={{
                fontSize: 12,
                color: "var(--red, #ff4444)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ⚠ {vm.urlError}
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Only HTTPS URLs are supported. The page is fetched via a CORS proxy
            and rendered locally.
          </p>

          {/* ── Sandboxed iframe preview ── */}
          {previewUrl && isOnline && (
            <div
              style={{
                marginTop: 8,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "6px 12px",
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Preview: {previewUrl}
              </div>
              <iframe
                src={previewUrl}
                sandbox="allow-scripts allow-same-origin"
                title="URL preview"
                style={{
                  width: "100%",
                  height: 320,
                  border: "none",
                  display: "block",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── File mode ── */}
      {inputMode === "file" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
          }}
        >
          <FileDropZone
            accept={[{ mime: "text/html", extension: ".html" }]}
            onFilesAccepted={() => {}}
            onError={() => {}}
          />
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            Drop an HTML file to convert it to PDF locally.
          </p>
        </div>
      )}

      {/* ── Settings card ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          ⚙️ Settings
        </div>

        {/* Row 1: Page size + Orientation */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: "1 1 160px",
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}
            >
              Page size
            </span>
            <div className="tab-group">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  className={`tab-btn${
                    vm.config.pageSize === size ? " active" : ""
                  }`}
                  onClick={() => vm.setConfig({ pageSize: size })}
                  disabled={busy}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: "1 1 160px",
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}
            >
              Orientation
            </span>
            <div className="tab-group">
              {ORIENTATIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  className={`tab-btn${
                    vm.config.orientation === value ? " active" : ""
                  }`}
                  onClick={() => vm.setConfig({ orientation: value })}
                  disabled={busy}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Screen width */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}
            >
              Screen width
            </span>
            <span
              style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}
            >
              {vm.config.screenWidth}px
            </span>
          </div>
          <input
            type="range"
            min={320}
            max={1920}
            step={10}
            value={vm.config.screenWidth}
            onChange={(e) =>
              vm.setConfig({ screenWidth: Number(e.target.value) })
            }
            disabled={busy}
            style={{ width: "100%", accentColor: "var(--green)" }}
            aria-label="Screen width"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>320px (mobile)</span>
            <span>1280px (desktop)</span>
            <span>1920px (wide)</span>
          </div>
        </div>

        {/* Row 3: Margins */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}
          >
            Margins (mm)
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <div
                key={side}
                style={{ display: "flex", flexDirection: "column", gap: 4 }}
              >
                <label
                  htmlFor={`margin-${side}`}
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "capitalize",
                  }}
                >
                  {side}
                </label>
                <input
                  id={`margin-${side}`}
                  className="input-field"
                  type="number"
                  min={0}
                  max={50}
                  value={vm.config.margins[side]}
                  onChange={(e) =>
                    vm.setMargin(side, Math.max(0, Number(e.target.value)))
                  }
                  disabled={busy}
                  style={{ textAlign: "center" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={handleReset}
      />

      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={vm.clearWorkbox}
          onReset={handleReset}
        />
      )}
    </ToolLayout>
  );
}
