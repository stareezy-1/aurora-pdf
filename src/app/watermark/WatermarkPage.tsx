import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useWatermark } from "./hooks/useWatermark";
import type { WatermarkPlacement } from "@/types/tool.types";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const FONT_FAMILIES = [
  "Helvetica",
  "Times New Roman",
  "Courier",
  "Georgia",
  "Verdana",
  "Arial",
  "Trebuchet MS",
  "Palatino",
  "Garamond",
  "Bookman",
  "Comic Sans MS",
  "Impact",
];

export default function WatermarkPage() {
  usePageTitle("Add Watermark");
  const vm = useWatermark();

  if (!vm.pdfFile || vm.status !== "idle") {
    return (
      <ToolLayout toolName="Add Watermark">
        <div className="tool-header">
          <h1>💧 Add Watermark</h1>
          <p>Apply a custom text watermark to every page of your PDF.</p>
        </div>
        {vm.status === "idle" && (
          <FileDropZone
            accept={PDF_ACCEPT}
            onFilesAccepted={vm.handleFileDrop}
            onError={(msg) => useAuroraStore.getState().failSession(msg)}
            aria-label="Drop a PDF to watermark"
          />
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
            onDownload={vm.handleReset}
            onReset={vm.handleReset}
          />
        )}
      </ToolLayout>
    );
  }

  return (
    <ToolLayout toolName="Add Watermark" wide>
      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .watermark-shell {
            flex-direction: column !important;
          }
          .watermark-shell .editor-sidebar {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="editor-shell watermark-shell">
        {/* Sidebar */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">💧 Add Watermark</div>
          <div className="editor-sidebar-body">
            <div className="file-info-strip">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{vm.pdfFile.name}</div>
                <div className="file-size">
                  {vm.pageCount} page{vm.pageCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="wm-text">
                Watermark text
              </label>
              <input
                id="wm-text"
                className="input-field"
                value={vm.config.text}
                onChange={(e) =>
                  vm.update({ text: e.target.value.slice(0, 100) })
                }
                maxLength={100}
                aria-label="Watermark text"
              />
            </div>

            <div>
              <label className="label" htmlFor="wm-font-family">
                Font family
              </label>
              <select
                id="wm-font-family"
                className="input-field"
                value={vm.config.fontFamily}
                onChange={(e) => vm.update({ fontFamily: e.target.value })}
                aria-label="Font family"
                style={{ fontFamily: vm.config.fontFamily }}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                Font size:{" "}
                <span style={{ color: "var(--green)" }}>
                  {vm.config.fontSize}pt
                </span>
              </label>
              <div className="slider-wrap">
                <input
                  type="range"
                  min={8}
                  max={144}
                  value={vm.config.fontSize}
                  onChange={(e) =>
                    vm.update({ fontSize: Number(e.target.value) })
                  }
                  aria-label="Font size"
                />
                <span className="slider-val">{vm.config.fontSize}</span>
              </div>
            </div>

            <div>
              <label className="label">
                Opacity:{" "}
                <span style={{ color: "var(--green)" }}>
                  {vm.config.opacity}%
                </span>
              </label>
              <div className="slider-wrap">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={vm.config.opacity}
                  onChange={(e) =>
                    vm.update({ opacity: Number(e.target.value) })
                  }
                  aria-label="Opacity"
                />
                <span className="slider-val">{vm.config.opacity}%</span>
              </div>
            </div>

            <div>
              <label className="label">
                Rotation:{" "}
                <span style={{ color: "var(--green)" }}>
                  {vm.config.rotation}°
                </span>
              </label>
              <div className="slider-wrap">
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={vm.config.rotation}
                  onChange={(e) =>
                    vm.update({ rotation: Number(e.target.value) })
                  }
                  aria-label="Rotation"
                />
                <span className="slider-val">{vm.config.rotation}°</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div>
                <label className="label" htmlFor="wm-color">
                  Color
                </label>
                <input
                  id="wm-color"
                  type="color"
                  value={vm.config.color}
                  onChange={(e) => vm.update({ color: e.target.value })}
                  aria-label="Watermark color"
                  style={{
                    width: 48,
                    height: 36,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            <div>
              <label className="label">Placement</label>
              <div className="tab-group">
                {(["diagonal", "header", "footer"] as WatermarkPlacement[]).map(
                  (p) => (
                    <button
                      key={p}
                      className={`tab-btn${
                        vm.config.placement === p ? " active" : ""
                      }`}
                      onClick={() => vm.update({ placement: p })}
                      aria-pressed={vm.config.placement === p}
                    >
                      {p === "diagonal"
                        ? "↗ Diagonal"
                        : p === "header"
                        ? "⬆ Header"
                        : "⬇ Footer"}
                    </button>
                  ),
                )}
              </div>
            </div>

            {vm.pageCount > 1 && (
              <div>
                <label className="label">Preview page</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => vm.setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={vm.currentPage === 0 || vm.previewAllPages}
                  >
                    ‹
                  </button>
                  <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                    {vm.currentPage + 1} / {vm.pageCount}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      vm.setCurrentPage((p) =>
                        Math.min(vm.pageCount - 1, p + 1),
                      )
                    }
                    disabled={
                      vm.currentPage === vm.pageCount - 1 || vm.previewAllPages
                    }
                  >
                    ›
                  </button>
                </div>

                <button
                  className={`btn btn-sm${
                    vm.previewAllPages ? " btn-primary" : " btn-secondary"
                  }`}
                  onClick={vm.togglePreviewAllPages}
                  aria-pressed={vm.previewAllPages}
                  style={{ marginTop: 8, width: "100%" }}
                >
                  {vm.previewAllPages
                    ? "⏹ Stop preview"
                    : "▶ Preview all pages"}
                </button>
              </div>
            )}
          </div>

          <div className="editor-sidebar-footer">
            <button
              className="btn btn-primary"
              onClick={() => vm.pdfFile && vm.processor.run(vm.pdfFile)}
              aria-label="Apply watermark to all pages"
            >
              Apply to All Pages
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
            >
              Change file
            </button>
          </div>
        </aside>

        {/* Canvas */}
        <div className="editor-canvas">
          <div className="editor-canvas-toolbar">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Live preview — page {vm.currentPage + 1} of {vm.pageCount}
              {vm.previewAllPages && (
                <span
                  style={{
                    marginLeft: 8,
                    color: "var(--green)",
                    fontWeight: 600,
                  }}
                >
                  ● Auto-cycling
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--green)",
                marginLeft: "auto",
              }}
            >
              Watermark will be applied to all {vm.pageCount} pages
            </span>
          </div>

          {vm.pagePreviews[vm.currentPage] ? (
            <div
              className="editor-page-wrap"
              style={{ cursor: "default", position: "relative" }}
            >
              <img
                src={vm.pagePreviews[vm.currentPage]}
                alt={`Page ${vm.currentPage + 1}`}
                style={{ display: "block", maxWidth: "min(860px, 100%)" }}
                draggable={false}
              />
              {/* Canvas overlay — draws watermark accurately matching engine output */}
              <canvas
                ref={vm.canvasRef}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            </div>
          ) : (
            <div
              style={{ color: "var(--text-muted)", fontSize: 14, padding: 60 }}
            >
              Loading preview…
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
