import { useRef } from "react";
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

const PLACEMENT_OPTIONS: Array<{
  value: WatermarkPlacement | "custom";
  label: string;
}> = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top-Left" },
  { value: "top-right", label: "Top-Right" },
  { value: "bottom-left", label: "Bot-Left" },
  { value: "bottom-right", label: "Bot-Right" },
  { value: "custom", label: "Custom" },
];

const PAGE_RANGE_PRESETS = [
  { value: "", label: "All Pages" },
  { value: "first", label: "First" },
  { value: "last", label: "Last" },
  { value: "odd", label: "Odd" },
  { value: "even", label: "Even" },
];

export default function WatermarkPage() {
  usePageTitle("Add Watermark");
  const vm = useWatermark();
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!vm.pdfFile || vm.status !== "idle") {
    return (
      <ToolLayout toolName="Add Watermark">
        <div className="tool-header">
          <h1>Add Watermark</h1>
          <p>
            Apply text or image watermarks to your PDF with full control over
            placement, opacity, and page targeting.
          </p>
        </div>
        {vm.status === "idle" && (
          <FileDropZone
            accept={PDF_ACCEPT}
            onFilesAccepted={vm.handleFileDrop}
            onError={(msg) => useAuroraStore.getState().failSession(msg)}
            aria-label="Drop a PDF to watermark"
            tool="watermark"
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
            tool="watermark"
          />
        )}
      </ToolLayout>
    );
  }

  return (
    <ToolLayout toolName="Add Watermark" wide>
      <style>{`
        @media (max-width: 768px) {
          .watermark-shell { flex-direction: column !important; }
          .watermark-shell .editor-sidebar { width: 100% !important; max-width: 100% !important; }
        }
        .wm-type-btn { flex: 1; padding: 8px 12px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: background 0.15s, color 0.15s; }
        .wm-type-btn.active { background: var(--green); color: #fff; border-color: var(--green); }
        .wm-placement-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
        .wm-placement-btn { padding: 6px 4px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: var(--radius-sm); cursor: pointer; font-size: 11px; text-align: center; transition: background 0.15s, color 0.15s; }
        .wm-placement-btn.active { background: var(--green); color: #fff; border-color: var(--green); }
        .wm-image-drop { border: 2px dashed var(--border); border-radius: var(--radius-sm); padding: 16px; text-align: center; cursor: pointer; color: var(--text-2); font-size: 13px; transition: border-color 0.15s; }
        .wm-image-drop:hover { border-color: var(--green); }
        .wm-image-preview { max-width: 100%; max-height: 80px; border-radius: var(--radius-sm); margin-top: 8px; object-fit: contain; }
        .wm-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .wm-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .wm-toggle input { opacity: 0; width: 0; height: 0; }
        .wm-toggle-slider { position: absolute; inset: 0; background: var(--border); border-radius: 20px; cursor: pointer; transition: background 0.2s; }
        .wm-toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
        .wm-toggle input:checked + .wm-toggle-slider { background: var(--green); }
        .wm-toggle input:checked + .wm-toggle-slider::before { transform: translateX(16px); }
        .wm-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; margin-top: 4px; }
        .wm-error { color: var(--red, #e53e3e); font-size: 12px; margin-top: 4px; }
      `}</style>

      <div className="editor-shell watermark-shell">
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">Add Watermark</div>
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

            {/* Watermark Type selector */}
            <div>
              <div className="wm-section-title">Watermark Type</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={
                    "wm-type-btn" + (vm.config.type === "text" ? " active" : "")
                  }
                  onClick={() => vm.update({ type: "text" })}
                  aria-pressed={vm.config.type === "text"}
                >
                  Text
                </button>
                <button
                  className={
                    "wm-type-btn" +
                    (vm.config.type === "image" ? " active" : "")
                  }
                  onClick={() => vm.update({ type: "image" })}
                  aria-pressed={vm.config.type === "image"}
                >
                  Image
                </button>
              </div>
            </div>

            {/* Text watermark controls */}
            {vm.config.type === "text" && (
              <>
                <div>
                  <label className="label" htmlFor="wm-text">
                    Watermark text
                  </label>
                  <input
                    id="wm-text"
                    className="input-field"
                    value={vm.config.text ?? ""}
                    onChange={(e) =>
                      vm.update({ text: e.target.value.slice(0, 200) })
                    }
                    maxLength={200}
                    aria-label="Watermark text"
                    placeholder="e.g. CONFIDENTIAL"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="wm-font-family">
                    Font family
                  </label>
                  <select
                    id="wm-font-family"
                    className="input-field"
                    value={vm.config.fontFamily ?? "Helvetica"}
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
                      {vm.config.fontSize ?? 48}pt
                    </span>
                  </label>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min={8}
                      max={144}
                      value={vm.config.fontSize ?? 48}
                      onChange={(e) =>
                        vm.update({ fontSize: Number(e.target.value) })
                      }
                      aria-label="Font size"
                    />
                    <span className="slider-val">
                      {vm.config.fontSize ?? 48}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="wm-color">
                    Color
                  </label>
                  <input
                    id="wm-color"
                    type="color"
                    value={vm.config.color ?? "#888888"}
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
              </>
            )}

            {/* Image watermark controls */}
            {vm.config.type === "image" && (
              <div>
                <div className="wm-section-title">Image Watermark</div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) vm.handleImageUpload(file);
                    e.target.value = "";
                  }}
                  aria-label="Upload image watermark"
                />
                <div
                  className="wm-image-drop"
                  onClick={() => imageInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      imageInputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    "Click to upload image watermark (PNG, JPEG, SVG, max " +
                    vm.MAX_IMAGE_MB +
                    " MB)"
                  }
                >
                  {vm.config.imageDataUrl ? (
                    <>
                      <img
                        src={vm.config.imageDataUrl}
                        alt="Watermark preview"
                        className="wm-image-preview"
                      />
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        Click to change image
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>🖼</div>
                      <div>Click to upload PNG, JPEG, or SVG</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        Max {vm.MAX_IMAGE_MB} MB
                      </div>
                    </>
                  )}
                </div>
                {vm.imageError && (
                  <div className="wm-error" role="alert">
                    {vm.imageError}
                  </div>
                )}
              </div>
            )}

            {/* Shared: Opacity */}
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
                  min={5}
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

            {/* Shared: Rotation */}
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

            {/* Placement mode selector */}
            <div>
              <div className="wm-section-title">Placement</div>
              <div className="wm-placement-grid">
                {PLACEMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={
                      "wm-placement-btn" +
                      (vm.config.placement === opt.value ? " active" : "")
                    }
                    onClick={() => vm.update({ placement: opt.value })}
                    aria-pressed={vm.config.placement === opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {vm.config.placement === "custom" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div>
                    <label className="label" htmlFor="wm-custom-x">
                      X %
                    </label>
                    <input
                      id="wm-custom-x"
                      type="number"
                      className="input-field"
                      min={0}
                      max={100}
                      value={vm.config.customX ?? 50}
                      onChange={(e) =>
                        vm.update({
                          customX: Math.max(
                            0,
                            Math.min(100, Number(e.target.value)),
                          ),
                        })
                      }
                      aria-label="Custom X position (percent)"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="wm-custom-y">
                      Y %
                    </label>
                    <input
                      id="wm-custom-y"
                      type="number"
                      className="input-field"
                      min={0}
                      max={100}
                      value={vm.config.customY ?? 50}
                      onChange={(e) =>
                        vm.update({
                          customY: Math.max(
                            0,
                            Math.min(100, Number(e.target.value)),
                          ),
                        })
                      }
                      aria-label="Custom Y position (percent)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tile mode toggle */}
            <div className="wm-toggle-row">
              <span className="label" style={{ margin: 0 }}>
                Tile mode
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 400,
                  }}
                >
                  Repeat watermark across page
                </span>
              </span>
              <label className="wm-toggle" aria-label="Toggle tile mode">
                <input
                  type="checkbox"
                  checked={vm.config.tile}
                  onChange={(e) => vm.update({ tile: e.target.checked })}
                />
                <span className="wm-toggle-slider" />
              </label>
            </div>

            {/* Page targeting */}
            <div>
              <div className="wm-section-title">Page Targeting</div>
              <div className="tab-group" style={{ flexWrap: "wrap", gap: 4 }}>
                {PAGE_RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    className={
                      "tab-btn" +
                      (vm.config.pageRange === preset.value ? " active" : "")
                    }
                    onClick={() => vm.update({ pageRange: preset.value })}
                    aria-pressed={vm.config.pageRange === preset.value}
                    style={{ fontSize: 11 }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="label" htmlFor="wm-page-range">
                  Custom range (e.g. 1-3,5,7-9)
                </label>
                <input
                  id="wm-page-range"
                  className="input-field"
                  value={
                    PAGE_RANGE_PRESETS.some(
                      (p) => p.value === vm.config.pageRange,
                    )
                      ? ""
                      : vm.config.pageRange
                  }
                  onChange={(e) => vm.update({ pageRange: e.target.value })}
                  placeholder="e.g. 1-3,5,7-9"
                  aria-label="Custom page range"
                />
              </div>
            </div>

            {/* Layer control */}
            <div>
              <div className="wm-section-title">Layer</div>
              <div className="tab-group">
                <button
                  className={
                    "tab-btn" +
                    (vm.config.layer === "foreground" ? " active" : "")
                  }
                  onClick={() => vm.update({ layer: "foreground" })}
                  aria-pressed={vm.config.layer === "foreground"}
                >
                  Foreground
                </button>
                <button
                  className={
                    "tab-btn" +
                    (vm.config.layer === "background" ? " active" : "")
                  }
                  onClick={() => vm.update({ layer: "background" })}
                  aria-pressed={vm.config.layer === "background"}
                >
                  Background
                </button>
              </div>
            </div>

            {/* Page preview navigation */}
            {vm.pageCount > 1 && (
              <div>
                <label className="label">Preview page</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => vm.setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={vm.currentPage === 0 || vm.previewAllPages}
                    aria-label="Previous page"
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
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
                <button
                  className={
                    "btn btn-sm" +
                    (vm.previewAllPages ? " btn-primary" : " btn-secondary")
                  }
                  onClick={vm.togglePreviewAllPages}
                  aria-pressed={vm.previewAllPages}
                  style={{ marginTop: 8, width: "100%" }}
                >
                  {vm.previewAllPages ? "Stop preview" : "Preview all pages"}
                </button>
              </div>
            )}
          </div>

          <div className="editor-sidebar-footer">
            <button
              className="btn btn-primary"
              onClick={vm.handleApply}
              aria-label="Apply watermark"
              disabled={vm.config.type === "image" && !vm.config.imageDataUrl}
            >
              Apply Watermark
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
            >
              Change file
            </button>
          </div>
        </aside>

        {/* Canvas preview area */}
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
                  Auto-cycling
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
              {vm.config.pageRange === "" || vm.config.pageRange === "all"
                ? "Watermark will be applied to all " + vm.pageCount + " pages"
                : "Targeting: " + (vm.config.pageRange || "all pages")}
            </span>
          </div>

          {vm.isLoading ? (
            <div
              style={{ color: "var(--text-muted)", fontSize: 14, padding: 60 }}
            >
              Loading preview…
            </div>
          ) : vm.pagePreviews[vm.currentPage] ? (
            <div
              className="editor-page-wrap"
              style={{ cursor: "default", position: "relative" }}
            >
              <img
                src={vm.pagePreviews[vm.currentPage]}
                alt={"Page " + (vm.currentPage + 1)}
                style={{ display: "block", maxWidth: "min(860px, 100%)" }}
                draggable={false}
              />
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
