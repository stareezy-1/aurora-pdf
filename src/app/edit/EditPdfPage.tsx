import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useEditPdf } from "./hooks/useEditPdf";
import type { Tool } from "./hooks/useEditPdf";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const TOOL_BUTTONS: { id: Tool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "↖" },
  { id: "text", label: "Text", icon: "T" },
  { id: "image", label: "Image", icon: "🖼" },
  { id: "sign", label: "Sign", icon: "✍️" },
  { id: "watermark", label: "Watermark", icon: "💧" },
];

const FONT_OPTIONS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier", label: "Courier" },
  { value: "Georgia", label: "Georgia" },
  { value: "Arial", label: "Arial" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Impact", label: "Impact" },
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Palatino", label: "Palatino" },
  { value: "Garamond", label: "Garamond" },
  { value: "Bookman", label: "Bookman" },
];

export default function EditPdfPage() {
  usePageTitle("Edit PDF");
  const vm = useEditPdf();

  if (!vm.pdfBytes || vm.status !== "idle") {
    return (
      <ToolLayout toolName="Edit PDF">
        <div className="tool-header">
          <h1>✏️ Edit PDF</h1>
          <p>
            Insert text, images, signatures, watermarks — reorder and delete
            pages.
          </p>
        </div>
        {vm.status === "idle" && (
          <FileDropZone
            accept={PDF_ACCEPT}
            onFilesAccepted={vm.handleFileDrop}
            onError={(msg) => useAuroraStore.getState().failSession(msg)}
            aria-label="Drop a PDF to edit"
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
            onDownload={vm.clearWorkbox}
            onReset={vm.handleReset}
          />
        )}
      </ToolLayout>
    );
  }

  return (
    <ToolLayout toolName="Edit PDF" wide>
      <div className="editor-shell">
        {/* ── Sidebar ── */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">
            ✏️ Edit PDF
            {vm.originalFile && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontWeight: 400,
                  marginLeft: "auto",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 120,
                }}
              >
                {vm.originalFile.name}
              </span>
            )}
          </div>

          <div className="editor-sidebar-body">
            {/* Tool selector */}
            <div>
              <div className="label">Tool</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {TOOL_BUTTONS.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => vm.setActiveTool(id)}
                    aria-pressed={vm.activeTool === id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background:
                        vm.activeTool === id
                          ? "rgba(0,255,136,0.12)"
                          : "var(--surface-2)",
                      color:
                        vm.activeTool === id ? "var(--green)" : "var(--text-2)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font)",
                      transition: "all 0.15s",
                    }}
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Text options ── */}
            {vm.activeTool === "text" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div>
                  <label className="label" htmlFor="edit-text">
                    Text content
                  </label>
                  <input
                    id="edit-text"
                    className="input-field"
                    value={vm.textInput}
                    onChange={(e) => vm.setTextInput(e.target.value)}
                    placeholder="Enter text…"
                  />
                </div>
                <div>
                  <label className="label">
                    Font size:{" "}
                    <span style={{ color: "var(--green)" }}>
                      {vm.textSize}pt
                    </span>
                  </label>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min={8}
                      max={96}
                      value={vm.textSize}
                      onChange={(e) => vm.setTextSize(Number(e.target.value))}
                      aria-label="Font size"
                    />
                    <span className="slider-val">{vm.textSize}</span>
                  </div>
                </div>
                <div
                  style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
                >
                  <div>
                    <label className="label" htmlFor="edit-color">
                      Color
                    </label>
                    <input
                      id="edit-color"
                      type="color"
                      value={vm.textColor}
                      onChange={(e) => vm.setTextColor(e.target.value)}
                      style={{
                        width: 40,
                        height: 32,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label" htmlFor="edit-font">
                      Font family
                    </label>
                    <select
                      id="edit-font"
                      className="select-field"
                      value={vm.textFont}
                      onChange={(e) => vm.setTextFont(e.target.value)}
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Click on the page to place text
                </div>
              </div>
            )}

            {/* ── Image options ── */}
            {vm.activeTool === "image" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <input
                  ref={vm.imgInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      vm.setPendingImgDataUrl(ev.target?.result as string);
                    reader.readAsDataURL(f);
                    e.target.value = "";
                  }}
                  aria-hidden="true"
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => vm.imgInputRef.current?.click()}
                  aria-label="Choose image"
                >
                  📁 Choose Image
                </button>
                {vm.pendingImgDataUrl && (
                  <>
                    <img
                      src={vm.pendingImgDataUrl}
                      alt="Selected"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 80,
                        borderRadius: 4,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <div className="alert alert-info" style={{ fontSize: 12 }}>
                      Click on the page to place image
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Sign options ── */}
            {vm.activeTool === "sign" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div className="tab-group">
                  <button className="tab-btn active" style={{ fontSize: 12 }}>
                    ✏️ Draw
                  </button>
                </div>
                <canvas
                  ref={vm.signCanvasRef}
                  width={260}
                  height={90}
                  style={{
                    background: "#fff",
                    borderRadius: "var(--radius-md)",
                    cursor: "crosshair",
                    display: "block",
                    width: "100%",
                    touchAction: "none",
                    border: "1px solid var(--border)",
                  }}
                  onMouseDown={vm.startSignDraw}
                  onMouseMove={vm.doSignDraw}
                  onMouseUp={vm.endSignDraw}
                  onMouseLeave={vm.endSignDraw}
                  aria-label="Draw signature"
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.clearSignCanvas}
                  >
                    Clear
                  </button>
                  {vm.signDataUrl && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--green)",
                        alignSelf: "center",
                      }}
                    >
                      ✓ Ready
                    </span>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="sign-typed">
                    Or type name
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      id="sign-typed"
                      className="input-field"
                      value={vm.signTypedName}
                      onChange={(e) => vm.setSignTypedName(e.target.value)}
                      placeholder="Your name…"
                      style={{ fontFamily: "Georgia, serif", fontSize: 16 }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={vm.renderTypedSign}
                      disabled={!vm.signTypedName}
                      style={{ flexShrink: 0 }}
                    >
                      Use
                    </button>
                  </div>
                </div>
                {vm.signDataUrl && (
                  <div className="alert alert-info" style={{ fontSize: 12 }}>
                    Click on the page to place signature
                  </div>
                )}
              </div>
            )}

            {/* ── Watermark options ── */}
            {vm.activeTool === "watermark" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div>
                  <label className="label" htmlFor="wm-text-edit">
                    Watermark text
                  </label>
                  <input
                    id="wm-text-edit"
                    className="input-field"
                    value={vm.wmText}
                    onChange={(e) => vm.setWmText(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="label">
                    Opacity:{" "}
                    <span style={{ color: "var(--green)" }}>
                      {vm.wmOpacity}%
                    </span>
                  </label>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min={10}
                      max={80}
                      value={vm.wmOpacity}
                      onChange={(e) => vm.setWmOpacity(Number(e.target.value))}
                      aria-label="Watermark opacity"
                    />
                    <span className="slider-val">{vm.wmOpacity}%</span>
                  </div>
                </div>
                <div>
                  <label className="label">
                    Rotation:{" "}
                    <span style={{ color: "var(--green)" }}>
                      {vm.wmRotation}°
                    </span>
                  </label>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={vm.wmRotation}
                      onChange={(e) => vm.setWmRotation(Number(e.target.value))}
                      aria-label="Watermark rotation"
                    />
                    <span className="slider-val">{vm.wmRotation}°</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <label
                    className="label"
                    htmlFor="wm-color-edit"
                    style={{ marginBottom: 0 }}
                  >
                    Color
                  </label>
                  <input
                    id="wm-color-edit"
                    type="color"
                    value={vm.wmColor}
                    onChange={(e) => vm.setWmColor(e.target.value)}
                    style={{
                      width: 40,
                      height: 32,
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  />
                </div>
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Click on the page to place watermark
                </div>
              </div>
            )}

            {/* ── Selected overlay editor ── */}
            {vm.selectedId &&
              (() => {
                const ov = vm.overlays.find((o) => o.id === vm.selectedId);
                if (!ov) return null;
                return (
                  <div
                    className="card-sm"
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div className="label">Selected element</div>
                    {ov.type === "text" && (
                      <>
                        <input
                          className="input-field"
                          value={ov.text ?? ""}
                          onChange={(e) =>
                            vm.setOverlays((prev) =>
                              prev.map((o) =>
                                o.id === vm.selectedId
                                  ? { ...o, text: e.target.value }
                                  : o,
                              ),
                            )
                          }
                        />
                        <div className="slider-wrap">
                          <input
                            type="range"
                            min={8}
                            max={144}
                            value={ov.fontSize ?? 18}
                            onChange={(e) =>
                              vm.setOverlays((prev) =>
                                prev.map((o) =>
                                  o.id === vm.selectedId
                                    ? { ...o, fontSize: Number(e.target.value) }
                                    : o,
                                ),
                              )
                            }
                            aria-label="Font size"
                          />
                          <span className="slider-val">{ov.fontSize}pt</span>
                        </div>
                      </>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => vm.deleteOverlay(vm.selectedId!)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                );
              })()}

            {/* ── Page thumbnails ── */}
            <div>
              <div className="label" style={{ marginBottom: 8 }}>
                Pages ({vm.thumbnails.length}) — drag to reorder
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vm.thumbnails.map((src, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => vm.setDragSrc(i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      vm.setDragOver(i);
                    }}
                    onDrop={() => vm.handleThumbDrop(i)}
                    onDragEnd={() => {
                      vm.setDragSrc(null);
                      vm.setDragOver(null);
                    }}
                    onClick={() => vm.setCurrentPage(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      background:
                        vm.currentPage === i
                          ? "rgba(0,255,136,0.1)"
                          : "transparent",
                      border:
                        vm.currentPage === i
                          ? "1px solid var(--green)"
                          : "1px solid transparent",
                      outline:
                        vm.dragOver === i ? "2px solid var(--green)" : "none",
                      transition: "all 0.15s",
                    }}
                    aria-label={`Page ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt={`Page ${i + 1}`}
                      style={{
                        width: 40,
                        height: 52,
                        objectFit: "contain",
                        borderRadius: 2,
                        background: "#fff",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                      Page {i + 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        vm.setDeleteConfirm(i);
                      }}
                      aria-label={`Delete page ${i + 1}`}
                      style={{
                        marginLeft: "auto",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: "2px 4px",
                        borderRadius: 4,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="editor-sidebar-footer">
            {vm.deleteConfirm !== null && (
              <div className="alert alert-error" style={{ marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 12 }}>
                  Delete page {vm.deleteConfirm + 1}?
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => vm.confirmDelete(vm.deleteConfirm!)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => vm.setDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleUndo}
              disabled={vm.snapshots.length === 0}
            >
              ↩ Undo ({vm.snapshots.length})
            </button>
            <button
              className="btn btn-primary"
              onClick={vm.handleExport}
              aria-label="Export edited PDF"
            >
              ⬇ Export PDF
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
            >
              Change file
            </button>
          </div>
        </aside>

        {/* ── Canvas area ── */}
        <div className="editor-canvas">
          <div className="editor-canvas-toolbar">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Page {vm.currentPage + 1} of {vm.thumbnails.length}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {TOOL_BUTTONS.map(({ id, icon }) => (
                <button
                  key={id}
                  className={`btn btn-sm${vm.activeTool === id ? " btn-purple" : " btn-secondary"}`}
                  onClick={() => vm.setActiveTool(id)}
                  aria-pressed={vm.activeTool === id}
                  title={id}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {vm.pagePreviews[vm.currentPage] ? (
            <div
              className="editor-page-wrap"
              style={{
                cursor: vm.activeTool === "select" ? "default" : "crosshair",
              }}
              onClick={vm.handleCanvasClick}
            >
              <img
                src={vm.pagePreviews[vm.currentPage]}
                alt={`Page ${vm.currentPage + 1}`}
                style={{ display: "block", maxWidth: "min(860px, 100%)" }}
                draggable={false}
              />

              {/* Overlays */}
              {vm.currentOverlays.map((ov) => (
                <div
                  key={ov.id}
                  className={`editor-overlay-item${vm.selectedId === ov.id ? " selected" : ""}`}
                  style={{
                    left: ov.x,
                    top: ov.y,
                    width: ov.width,
                    height: ov.height,
                  }}
                  onMouseDown={(e) => vm.startOverlayDrag(e, ov.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    vm.setSelectedId(ov.id);
                  }}
                >
                  {ov.type === "text" && (
                    <span
                      style={{
                        fontSize: ov.fontSize,
                        color: ov.color,
                        fontFamily: ov.fontFamily ?? "Helvetica",
                        opacity: ov.text === vm.wmText ? vm.wmOpacity / 100 : 1,
                        transform:
                          ov.text === vm.wmText
                            ? `rotate(-${vm.wmRotation}deg)`
                            : "none",
                        transformOrigin: "center",
                        whiteSpace: "pre",
                        pointerEvents: "none",
                        display: "block",
                        lineHeight: 1.2,
                      }}
                    >
                      {ov.text}
                    </span>
                  )}
                  {ov.type === "image" && ov.dataUrl && (
                    <img
                      src={ov.dataUrl}
                      alt="Inserted"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        pointerEvents: "none",
                      }}
                      draggable={false}
                    />
                  )}
                  {vm.selectedId === ov.id && (
                    <div
                      className="resize-handle"
                      onMouseDown={(e) => vm.startOverlayResize(e, ov.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{ color: "var(--text-muted)", fontSize: 14, padding: 60 }}
            >
              {vm.thumbnails.length === 0
                ? "Loading pages…"
                : "Select a page from the sidebar"}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
