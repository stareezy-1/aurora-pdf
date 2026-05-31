/**
 * RedactPage — Draw redaction regions and permanently remove content.
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6
 */

import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useRedact } from "./hooks/useRedact";

export default function RedactPage() {
  usePageTitle("Redact PDF");
  const vm = useRedact();

  return (
    <ToolLayout toolName="Redact Content">
      <div className="tool-header">
        <h1>🔲 Redact Content</h1>
        <p>
          Draw regions over sensitive content. Redactions are permanent — the
          underlying content is removed, not just covered.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to redact"
          tool="redact"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Sidebar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minWidth: 200,
              maxWidth: 240,
            }}
          >
            <div
              className="file-info-strip"
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
              }}
            >
              <div className="file-name" style={{ fontSize: 13 }}>
                {vm.file.name}
              </div>
              <div className="file-size">{vm.pageCount} pages</div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
                style={{ marginTop: 4 }}
              >
                Change file
              </button>
            </div>

            <div
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                fontSize: 12,
                color: "var(--text-2)",
              }}
            >
              ⚠️ Redactions are <strong>permanent</strong>. The content under
              each black box will be irreversibly removed from the PDF.
            </div>

            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 6,
                  color: "var(--text)",
                }}
              >
                Regions (
                {
                  vm.regions.filter((r) => r.pageIndex === vm.currentPage)
                    .length
                }{" "}
                on this page)
              </div>
              {vm.regions.filter((r) => r.pageIndex === vm.currentPage)
                .length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Click and drag on the preview to draw a redaction region.
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {vm.regions
                  .filter((r) => r.pageIndex === vm.currentPage)
                  .map((region, idx) => (
                    <div
                      key={region.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "var(--surface-2)",
                        borderRadius: "var(--radius-sm)",
                        padding: "4px 8px",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ color: "var(--text-2)" }}>
                        Region {idx + 1} ({Math.round(region.width)}×
                        {Math.round(region.height)})
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "2px 6px", fontSize: 11 }}
                        onClick={() => vm.removeRegion(region.id)}
                        aria-label={`Remove region ${idx + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
              {vm.regions.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={vm.clearRegions}
                >
                  Clear all regions
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: "auto",
              }}
            >
              {!vm.showConfirm ? (
                <button
                  className="btn btn-primary"
                  onClick={() => vm.setShowConfirm(true)}
                  disabled={vm.isPending || vm.regions.length === 0}
                >
                  🔲 Apply Redactions
                </button>
              ) : (
                <div
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Confirm permanent redaction?
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {vm.regions.length} region
                    {vm.regions.length !== 1 ? "s" : ""} will be permanently
                    removed.
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: "var(--red, #ef4444)" }}
                      onClick={vm.handleApply}
                    >
                      Confirm
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.setShowConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Page preview with drawing canvas */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              Click and drag to draw a redaction region. Regions appear as red
              overlays.
            </div>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                cursor: "crosshair",
                userSelect: "none",
              }}
              onMouseDown={vm.handleMouseDown}
              onMouseMove={vm.handleMouseMove}
              onMouseUp={vm.handleMouseUp}
            >
              {vm.preview && (
                <img
                  data-redact-preview
                  src={vm.preview}
                  alt="PDF page preview"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    border: "1px solid var(--border)",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Existing regions */}
              {vm.regions
                .filter((r) => r.pageIndex === vm.currentPage)
                .map((region) => (
                  <div
                    key={region.id}
                    style={{
                      position: "absolute",
                      left: region.x,
                      top: region.y,
                      width: region.width,
                      height: region.height,
                      background: "rgba(239,68,68,0.35)",
                      border: "2px solid rgba(239,68,68,0.8)",
                      pointerEvents: "none",
                    }}
                  />
                ))}

              {/* Active draw rect */}
              {vm.drawRect && (
                <div
                  style={{
                    position: "absolute",
                    left: vm.drawRect.x,
                    top: vm.drawRect.y,
                    width: vm.drawRect.width,
                    height: vm.drawRect.height,
                    background: "rgba(239,68,68,0.25)",
                    border: "2px dashed rgba(239,68,68,0.9)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={vm.handleReset}
      />

      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={() => useAuroraStore.getState().clearWorkbox()}
          onReset={vm.handleReset}
          tool="redact"
        />
      )}
    </ToolLayout>
  );
}
