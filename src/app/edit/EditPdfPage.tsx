import React from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useDragOverlay } from "@/hooks/useDragOverlay";
import { useEditPdf } from "./hooks/useEditPdf";
import type { Tool } from "./hooks/useEditPdf";
import type { Overlay } from "./hooks/useEditPdf";

type EditPdfVm = ReturnType<typeof useEditPdf>;

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const TOOL_BUTTONS: { id: Tool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "↖" },
  { id: "text", label: "Text", icon: "T" },
  { id: "image", label: "Image", icon: "🖼" },
  { id: "sign", label: "Sign", icon: "✍️" },
  { id: "watermark", label: "Watermark", icon: "💧" },
  { id: "draw", label: "Draw", icon: "✏" },
  { id: "shape", label: "Shape", icon: "⬜" },
  { id: "ocr-edit", label: "OCR Edit", icon: "🔍" },
  { id: "page-numbers", label: "Page #", icon: "🔢" },
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

// ── DrawCanvas ───────────────────────────────────────────────────────────────
// Transparent canvas overlay for freehand drawing. Positioned absolutely over
// the page image. Mouse and touch events are handled directly on the canvas.

function DrawCanvas({ vm }: { vm: EditPdfVm }) {
  // Sync canvas buffer dimensions to its rendered CSS size so strokes aren't
  // stretched. We observe the canvas element's bounding rect on mount and
  // whenever the window resizes.
  const syncSize = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (
      canvas.width !== Math.round(width) ||
      canvas.height !== Math.round(height)
    ) {
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    syncSize(e.currentTarget);
    const rect = e.currentTarget.getBoundingClientRect();
    vm.startDraw(e.clientX - rect.left, e.clientY - rect.top);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!vm.isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    vm.continueDraw(e.clientX - rect.left, e.clientY - rect.top);
  };
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    syncSize(e.currentTarget);
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0];
    vm.startDraw(t.clientX - rect.left, t.clientY - rect.top);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!vm.isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0];
    vm.continueDraw(t.clientX - rect.left, t.clientY - rect.top);
  };

  return (
    <canvas
      ref={vm.drawCanvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        cursor: "crosshair",
        touchAction: "none",
        // Transparent background so the page image shows through
        background: "transparent",
        zIndex: 10,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={vm.endDraw}
      onMouseLeave={vm.endDraw}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={vm.endDraw}
      aria-label="Freehand drawing canvas"
    />
  );
}

// ── PendingShapeOverlay ───────────────────────────────────────────────────────
// Draggable/resizable shape overlay placed on the page before committing.

function PendingShapeOverlay({ vm }: { vm: EditPdfVm }) {
  const shape = vm.pendingShape!;
  // Snapshot the shape position at drag/resize start so deltas are applied correctly
  const dragOriginRef = React.useRef<{ x: number; y: number } | null>(null);
  const resizeOriginRef = React.useRef<{ w: number; h: number } | null>(null);

  const dragHandlers = useDragOverlay({
    onDrag: ({ dx, dy }) => {
      if (!dragOriginRef.current) return;
      vm.setPendingShape((prev) =>
        prev
          ? {
              ...prev,
              x: dragOriginRef.current!.x + dx,
              y: dragOriginRef.current!.y + dy,
            }
          : prev,
      );
    },
    onDragEnd: () => {
      dragOriginRef.current = null;
    },
  });

  const resizeHandlers = useDragOverlay({
    onDrag: ({ dx, dy }) => {
      if (!resizeOriginRef.current) return;
      vm.setPendingShape((prev) =>
        prev
          ? {
              ...prev,
              width: Math.max(20, resizeOriginRef.current!.w + dx),
              height: Math.max(20, resizeOriginRef.current!.h + dy),
            }
          : prev,
      );
    },
    onDragEnd: () => {
      resizeOriginRef.current = null;
    },
  });

  const shapePreview = () => {
    const s = vm.shapeType;
    const stroke = vm.shapeStrokeColor;
    const fill = vm.shapeFillColor ?? "transparent";
    const sw = vm.shapeStrokeWidth;
    if (s === "rectangle") {
      return (
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <rect
            x={sw / 2}
            y={sw / 2}
            width={`calc(100% - ${sw}px)`}
            height={`calc(100% - ${sw}px)`}
            stroke={stroke}
            strokeWidth={sw}
            fill={fill}
          />
        </svg>
      );
    }
    if (s === "circle") {
      return (
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <ellipse
            cx="50%"
            cy="50%"
            rx={`calc(50% - ${sw / 2}px)`}
            ry={`calc(50% - ${sw / 2}px)`}
            stroke={stroke}
            strokeWidth={sw}
            fill={fill}
          />
        </svg>
      );
    }
    // line
    return (
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <line
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        cursor: "move",
        zIndex: 10,
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        dragOriginRef.current = { x: shape.x, y: shape.y };
        dragHandlers.onMouseDown(e);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        dragOriginRef.current = { x: shape.x, y: shape.y };
        dragHandlers.onTouchStart(e);
      }}
      aria-label="Pending shape overlay"
    >
      {shapePreview()}
      {/* Resize handle */}
      <div
        style={{
          position: "absolute",
          right: -6,
          bottom: -6,
          width: 12,
          height: 12,
          background: "var(--green)",
          borderRadius: 2,
          cursor: "se-resize",
          zIndex: 11,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          resizeOriginRef.current = { w: shape.width, h: shape.height };
          resizeHandlers.onMouseDown(e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          resizeOriginRef.current = { w: shape.width, h: shape.height };
          resizeHandlers.onTouchStart(e);
        }}
        aria-label="Resize shape"
      />
    </div>
  );
}

// ── OverlayItem ──────────────────────────────────────────────────────────────
// Extracted into its own component so useDragOverlay can be called per-overlay
// (hooks cannot be called inside a .map() callback).

interface OverlayItemProps {
  ov: Overlay;
  isSelected: boolean;
  wmText: string;
  wmOpacity: number;
  wmRotation: number;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, dx: number, dy: number) => void;
  onDragEnd: () => void;
  onResizeStart: (id: string) => void;
  onResizeMove: (id: string, dx: number, dy: number) => void;
  onResizeEnd: () => void;
}

function OverlayItem({
  ov,
  isSelected,
  wmText,
  wmOpacity,
  wmRotation,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: OverlayItemProps) {
  const dragHandlers = useDragOverlay({
    onDrag: ({ dx, dy }) => onDragMove(ov.id, dx, dy),
    onDragEnd,
  });

  const resizeHandlers = useDragOverlay({
    onDrag: ({ dx, dy }) => onResizeMove(ov.id, dx, dy),
    onDragEnd: onResizeEnd,
  });

  return (
    <div
      className={`editor-overlay-item${isSelected ? " selected" : ""}`}
      style={{
        left: ov.x,
        top: ov.y,
        width: ov.width,
        height: ov.height,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDragStart(ov.id);
        dragHandlers.onMouseDown(e);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        onDragStart(ov.id);
        dragHandlers.onTouchStart(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(ov.id);
      }}
    >
      {ov.type === "text" && (
        <span
          style={{
            fontSize: ov.fontSize,
            color: ov.color,
            fontFamily: ov.fontFamily ?? "Helvetica",
            opacity: ov.text === wmText ? wmOpacity / 100 : 1,
            transform:
              ov.text === wmText ? `rotate(-${wmRotation}deg)` : "none",
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
      {isSelected && (
        <div
          className="resize-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(ov.id);
            resizeHandlers.onMouseDown(e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            onResizeStart(ov.id);
            resizeHandlers.onTouchStart(e);
          }}
        />
      )}
    </div>
  );
}

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
            onDownload={vm.handleReset}
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

            {/* ── Draw options ── */}
            {vm.activeTool === "draw" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div
                  style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
                >
                  <div>
                    <label className="label" htmlFor="draw-color">
                      Stroke color
                    </label>
                    <input
                      id="draw-color"
                      type="color"
                      value={vm.drawStrokeColor}
                      onChange={(e) => vm.setDrawStrokeColor(e.target.value)}
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
                    <label className="label">
                      Width:{" "}
                      <span style={{ color: "var(--green)" }}>
                        {vm.drawStrokeWidth}px
                      </span>
                    </label>
                    <div className="slider-wrap">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={vm.drawStrokeWidth}
                        onChange={(e) =>
                          vm.setDrawStrokeWidth(Number(e.target.value))
                        }
                        aria-label="Stroke width"
                      />
                      <span className="slider-val">{vm.drawStrokeWidth}</span>
                    </div>
                  </div>
                </div>
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Draw freehand on the page preview
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={vm.commitDrawing}
                    aria-label="Commit drawing to PDF"
                  >
                    ✓ Commit Drawing
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.clearDrawCanvas}
                    aria-label="Clear drawing canvas"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* ── Shape options ── */}
            {vm.activeTool === "shape" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div>
                  <div className="label">Shape type</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["rectangle", "circle", "line"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => vm.setShapeType(t)}
                        aria-pressed={vm.shapeType === t}
                        style={{
                          flex: 1,
                          padding: "5px 4px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          background:
                            vm.shapeType === t
                              ? "rgba(0,255,136,0.12)"
                              : "var(--surface-2)",
                          color:
                            vm.shapeType === t
                              ? "var(--green)"
                              : "var(--text-2)",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "var(--font)",
                          textTransform: "capitalize",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
                >
                  <div>
                    <label className="label" htmlFor="shape-stroke-color">
                      Stroke
                    </label>
                    <input
                      id="shape-stroke-color"
                      type="color"
                      value={vm.shapeStrokeColor}
                      onChange={(e) => vm.setShapeStrokeColor(e.target.value)}
                      style={{
                        width: 40,
                        height: 32,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="shape-fill-color">
                      Fill
                    </label>
                    <div
                      style={{ display: "flex", gap: 4, alignItems: "center" }}
                    >
                      <input
                        id="shape-fill-color"
                        type="color"
                        value={vm.shapeFillColor ?? "#ffffff"}
                        onChange={(e) => vm.setShapeFillColor(e.target.value)}
                        disabled={vm.shapeFillColor === null}
                        style={{
                          width: 40,
                          height: 32,
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          cursor:
                            vm.shapeFillColor === null
                              ? "not-allowed"
                              : "pointer",
                          opacity: vm.shapeFillColor === null ? 0.4 : 1,
                        }}
                      />
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: "var(--text-2)",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={vm.shapeFillColor === null}
                          onChange={(e) =>
                            vm.setShapeFillColor(
                              e.target.checked ? null : "#ffffff",
                            )
                          }
                          aria-label="No fill"
                        />
                        None
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">
                    Stroke width:{" "}
                    <span style={{ color: "var(--green)" }}>
                      {vm.shapeStrokeWidth}pt
                    </span>
                  </label>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={vm.shapeStrokeWidth}
                      onChange={(e) =>
                        vm.setShapeStrokeWidth(Number(e.target.value))
                      }
                      aria-label="Shape stroke width"
                    />
                    <span className="slider-val">{vm.shapeStrokeWidth}</span>
                  </div>
                </div>
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  Click on the page to place a shape
                </div>
                {vm.pendingShape && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={vm.commitShape}
                    aria-label="Commit shape to PDF"
                  >
                    ✓ Commit Shape
                  </button>
                )}
              </div>
            )}

            {/* ── OCR Edit options ── */}
            {vm.activeTool === "ocr-edit" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <button
                  className="btn btn-primary btn-sm"
                  onClick={vm.runOcrOnPage}
                  disabled={vm.ocrLoading || !vm.pagePreviews[vm.currentPage]}
                  aria-label="Run OCR on current page"
                >
                  {vm.ocrLoading ? "⏳ Running OCR…" : "🔍 Run OCR"}
                </button>

                {vm.ocrLoading && (
                  <div className="alert alert-info" style={{ fontSize: 12 }}>
                    Detecting text on page {vm.currentPage + 1}…
                  </div>
                )}

                {!vm.ocrLoading && vm.ocrWords.length === 0 && (
                  <div className="alert alert-info" style={{ fontSize: 12 }}>
                    Click "Run OCR" to detect text on the current page, then
                    click a highlighted word to edit it.
                  </div>
                )}

                {!vm.ocrLoading &&
                  vm.ocrWords.length > 0 &&
                  !vm.selectedOcrWord && (
                    <div className="alert alert-info" style={{ fontSize: 12 }}>
                      {vm.ocrWords.length} word
                      {vm.ocrWords.length !== 1 ? "s" : ""} detected. Click a
                      highlighted word on the page to edit it.
                    </div>
                  )}

                {vm.selectedOcrWord && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div>
                      <label className="label" htmlFor="ocr-edit-text">
                        Edit detected word
                      </label>
                      <input
                        id="ocr-edit-text"
                        className="input-field"
                        value={vm.ocrEditText}
                        onChange={(e) => vm.setOcrEditText(e.target.value)}
                        placeholder="Replacement text…"
                        autoFocus
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={vm.commitOcrEdit}
                        disabled={!vm.ocrEditText.trim()}
                        aria-label="Confirm OCR text edit"
                      >
                        ✓ Confirm Edit
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          vm.setSelectedOcrWord(null);
                          vm.setOcrEditText("");
                        }}
                        aria-label="Cancel OCR edit"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Page Numbers options ── */}
            {vm.activeTool === "page-numbers" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div>
                  <label className="label" htmlFor="pagenum-position">
                    Position
                  </label>
                  <select
                    id="pagenum-position"
                    className="select-field"
                    value={vm.pageNumPosition}
                    onChange={(e) =>
                      vm.setPageNumPosition(
                        e.target.value as
                          | "bottom-center"
                          | "bottom-left"
                          | "bottom-right"
                          | "top-center",
                      )
                    }
                    aria-label="Page number position"
                  >
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="top-center">Top Center</option>
                  </select>
                </div>

                <div>
                  <div className="label">Format</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["1", "Page 1", "1/N"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => vm.setPageNumFormat(fmt)}
                        aria-pressed={vm.pageNumFormat === fmt}
                        style={{
                          flex: 1,
                          padding: "5px 4px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          background:
                            vm.pageNumFormat === fmt
                              ? "rgba(0,255,136,0.12)"
                              : "var(--surface-2)",
                          color:
                            vm.pageNumFormat === fmt
                              ? "var(--green)"
                              : "var(--text-2)",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "var(--font)",
                        }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="pagenum-font">
                    Font family
                  </label>
                  <select
                    id="pagenum-font"
                    className="select-field"
                    value={vm.pageNumFont}
                    onChange={(e) => vm.setPageNumFont(e.target.value)}
                    aria-label="Page number font family"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">
                    Font size:{" "}
                    <span style={{ color: "var(--green)" }}>
                      {vm.pageNumSize}pt
                    </span>
                  </label>
                  <div className="slider-wrap">
                    <input
                      type="range"
                      min={8}
                      max={144}
                      value={vm.pageNumSize}
                      onChange={(e) =>
                        vm.setPageNumSize(Number(e.target.value))
                      }
                      aria-label="Page number font size"
                    />
                    <span className="slider-val">{vm.pageNumSize}</span>
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
                >
                  <div>
                    <label className="label" htmlFor="pagenum-color">
                      Color
                    </label>
                    <input
                      id="pagenum-color"
                      type="color"
                      value={vm.pageNumColor}
                      onChange={(e) => vm.setPageNumColor(e.target.value)}
                      style={{
                        width: 40,
                        height: 32,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={vm.applyPageNumbersTool}
                  disabled={!vm.pdfBytes}
                  aria-label="Apply page numbers to all pages"
                >
                  🔢 Apply Page Numbers
                </button>
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
            <div className="editor-sidebar-pages">
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
                  className={`btn btn-sm${
                    vm.activeTool === id ? " btn-purple" : " btn-secondary"
                  }`}
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
                position: "relative",
              }}
              onClick={vm.handleCanvasClick}
            >
              <img
                src={vm.pagePreviews[vm.currentPage]}
                alt={`Page ${vm.currentPage + 1}`}
                style={{ display: "block", maxWidth: "min(860px, 100%)" }}
                draggable={false}
              />

              {/* Draw canvas overlay — transparent, sits on top of page image */}
              {vm.activeTool === "draw" && <DrawCanvas vm={vm} />}

              {/* Shape overlay — draggable/resizable pending shape */}
              {vm.activeTool === "shape" && vm.pendingShape && (
                <PendingShapeOverlay vm={vm} />
              )}

              {/* Overlays */}
              {vm.currentOverlays.map((ov) => (
                <OverlayItem
                  key={ov.id}
                  ov={ov}
                  isSelected={vm.selectedId === ov.id}
                  wmText={vm.wmText}
                  wmOpacity={vm.wmOpacity}
                  wmRotation={vm.wmRotation}
                  onSelect={vm.setSelectedId}
                  onDragStart={vm.beginOverlayDrag}
                  onDragMove={vm.moveOverlayDrag}
                  onDragEnd={vm.endOverlayDrag}
                  onResizeStart={vm.beginOverlayResize}
                  onResizeMove={vm.moveOverlayResize}
                  onResizeEnd={vm.endOverlayResize}
                />
              ))}

              {/* OCR word bounding box highlights */}
              {vm.activeTool === "ocr-edit" &&
                vm.ocrWords.length > 0 &&
                vm.ocrWords.map((word, idx) => {
                  const isSelected =
                    vm.selectedOcrWord !== null &&
                    vm.selectedOcrWord.text === word.text &&
                    vm.selectedOcrWord.bbox.x0 === word.bbox.x0 &&
                    vm.selectedOcrWord.bbox.y0 === word.bbox.y0;
                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      aria-label={`OCR word: ${word.text}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        vm.setSelectedOcrWord(word);
                        vm.setOcrEditText(word.text);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          vm.setSelectedOcrWord(word);
                          vm.setOcrEditText(word.text);
                        }
                      }}
                      style={{
                        position: "absolute",
                        left: word.bbox.x0,
                        top: word.bbox.y0,
                        width: word.bbox.x1 - word.bbox.x0,
                        height: word.bbox.y1 - word.bbox.y0,
                        background: isSelected
                          ? "rgba(0, 255, 136, 0.35)"
                          : "rgba(255, 220, 0, 0.30)",
                        border: isSelected
                          ? "2px solid var(--green)"
                          : "1px solid rgba(255, 180, 0, 0.7)",
                        borderRadius: 2,
                        cursor: "pointer",
                        boxSizing: "border-box",
                        zIndex: 20,
                        transition: "background 0.1s, border 0.1s",
                      }}
                      title={word.text}
                    />
                  );
                })}
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
