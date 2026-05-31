// Requirements: 4.1–4.10
import { useEffect, useState } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useDragOverlay } from "@/hooks/useDragOverlay";
import {
  useSignPdf,
  SIGNATURE_FONTS,
  SIGNATURE_FONTS_URL,
} from "./hooks/useSignPdf";
import type { SignatureMethod } from "@/types/tool.types";
import type { SigOverlay } from "./hooks/useSignPdf";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const SIG_IMG_ACCEPT = [
  { mime: "image/png", extension: ".png" },
  { mime: "image/jpeg", extension: ".jpg" },
];

function useGoogleFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${SIGNATURE_FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = SIGNATURE_FONTS_URL;
    document.head.appendChild(link);
  }, []);
}

// ── SignatureOverlay ──────────────────────────────────────────────────────────

interface SignatureOverlayProps {
  overlay: SigOverlay;
  isSelected: boolean;
  onSelect: () => void;
  beginOverlayDrag: (
    e: React.MouseEvent | React.TouchEvent,
    id: string,
  ) => void;
  moveOverlayDrag: (delta: { dx: number; dy: number }) => void;
  endOverlayDrag: () => void;
  beginOverlayResize: (
    e: React.MouseEvent | React.TouchEvent,
    id: string,
  ) => void;
  moveOverlayResize: (delta: { dx: number; dy: number }) => void;
  endOverlayResize: () => void;
}

function SignatureOverlay({
  overlay,
  isSelected,
  onSelect,
  beginOverlayDrag,
  moveOverlayDrag,
  endOverlayDrag,
  beginOverlayResize,
  moveOverlayResize,
  endOverlayResize,
}: SignatureOverlayProps) {
  const dragHandlers = useDragOverlay({
    onDrag: moveOverlayDrag,
    onDragEnd: endOverlayDrag,
  });
  const resizeHandlers = useDragOverlay({
    onDrag: moveOverlayResize,
    onDragEnd: endOverlayResize,
  });

  return (
    <div
      className={`editor-overlay-item${isSelected ? " selected" : ""}`}
      style={{
        left: overlay.x,
        top: overlay.y,
        width: overlay.width,
        height: overlay.height,
        transform: `rotate(${overlay.rotation}deg)`,
        opacity: overlay.opacity / 100,
      }}
      onMouseDown={(e) => {
        onSelect();
        beginOverlayDrag(e, overlay.id);
        dragHandlers.onMouseDown(e);
      }}
      onTouchStart={(e) => {
        onSelect();
        beginOverlayDrag(e, overlay.id);
        dragHandlers.onTouchStart(e);
      }}
    >
      <img
        src={overlay.dataUrl}
        alt="Signature overlay"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
        }}
        draggable={false}
      />
      <div
        className="resize-handle"
        onMouseDown={(e) => {
          e.stopPropagation();
          beginOverlayResize(e, overlay.id);
          resizeHandlers.onMouseDown(e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          beginOverlayResize(e, overlay.id);
          resizeHandlers.onTouchStart(e);
        }}
      />
    </div>
  );
}

// ── SavedSigItem ──────────────────────────────────────────────────────────────

interface SavedSigItemProps {
  name: string;
  dataUrl: string;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

function SavedSigItem({
  name,
  dataUrl,
  onSelect,
  onDelete,
  onRename,
}: SavedSigItemProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  function commitRename() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div
      className="card-sm"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
      }}
    >
      <img
        src={dataUrl}
        alt={name}
        style={{
          width: 60,
          height: 28,
          objectFit: "contain",
          background: "#fff",
          borderRadius: 3,
          padding: 2,
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={onSelect}
        title="Use this signature"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            className="input-field"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            style={{ fontSize: 12, padding: "2px 6px" }}
            aria-label={`Rename signature ${name}`}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {name}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: "2px 6px", fontSize: 11 }}
          onClick={onSelect}
          aria-label={`Use signature ${name}`}
        >
          Use
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: "2px 6px", fontSize: 11 }}
          onClick={() => setEditing(true)}
          aria-label={`Rename signature ${name}`}
        >
          ✏️
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{
            padding: "2px 6px",
            fontSize: 11,
            color: "var(--red, #e55)",
          }}
          onClick={onDelete}
          aria-label={`Delete signature ${name}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SignPdfPage() {
  usePageTitle("Sign PDF");
  useGoogleFonts();
  const vm = useSignPdf();

  // Drop-zone / progress / success screen
  if (!vm.pdfFile || vm.status !== "idle") {
    return (
      <ToolLayout toolName="Sign PDF">
        <div className="tool-header">
          <h1>✍️ Sign PDF</h1>
          <p>Add one or more signatures to any page. Draw, type, or upload.</p>
        </div>
        {vm.status === "idle" && (
          <FileDropZone
            accept={PDF_ACCEPT}
            onFilesAccepted={vm.handlePdfDrop}
            onError={(msg) => useAuroraStore.getState().failSession(msg)}
            aria-label="Drop a PDF to sign"
            tool="sign"
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
            tool="sign"
          />
        )}
      </ToolLayout>
    );
  }

  const selectedOverlay = vm.selectedOverlay;

  return (
    <ToolLayout toolName="Sign PDF" wide>
      <div className="editor-shell">
        {/* ── Sidebar ── */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">✍️ Sign PDF</div>

          <div className="editor-sidebar-body">
            {/* File info */}
            <div className="file-info-strip">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{vm.pdfFile.name}</div>
                <div className="file-size">
                  {vm.pageCount} page{vm.pageCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Page selector */}
            <div>
              <label className="label" htmlFor="page-select">
                Page to sign
              </label>
              <select
                id="page-select"
                className="select-field"
                value={vm.pageIndex}
                onChange={(e) => vm.setPageIndex(Number(e.target.value))}
                aria-label="Select page"
              >
                {Array.from({ length: vm.pageCount }, (_, i) => (
                  <option key={i} value={i}>
                    Page {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Signature method tabs */}
            <div>
              <label className="label">Signature method</label>
              <div className="tab-group">
                {(["draw", "type", "upload"] as SignatureMethod[]).map((m) => (
                  <button
                    key={m}
                    className={`tab-btn${vm.method === m ? " active" : ""}`}
                    onClick={() => {
                      vm.setMethod(m);
                      vm.setSigDataUrl(null);
                      vm.clearCanvas();
                    }}
                    aria-pressed={vm.method === m}
                  >
                    {m === "draw" ? "✏️" : m === "type" ? "⌨️" : "📤"}{" "}
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Draw method */}
            {vm.method === "draw" && (
              <div>
                <canvas
                  ref={vm.canvasRef}
                  width={260}
                  height={100}
                  className="sig-canvas"
                  style={{ width: "100%" }}
                  onMouseDown={vm.startDraw}
                  onMouseMove={vm.draw}
                  onMouseUp={vm.endDraw}
                  onMouseLeave={vm.endDraw}
                  aria-label="Draw your signature"
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.clearCanvas}
                  style={{ marginTop: 6 }}
                >
                  Clear
                </button>
              </div>
            )}

            {/* Type method */}
            {vm.method === "type" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <canvas
                  ref={vm.canvasRef}
                  width={260}
                  height={80}
                  style={{ display: "none" }}
                  aria-hidden="true"
                />
                <input
                  className="input-field"
                  value={vm.typedName}
                  onChange={(e) => vm.setTypedName(e.target.value)}
                  placeholder="Type your name…"
                  aria-label="Type your name"
                  style={{
                    fontFamily: `"${vm.typedSigFont}", cursive`,
                    fontSize: 20,
                  }}
                />
                <div>
                  <label className="label">Choose font</label>
                  <div
                    className="tab-group"
                    style={{ flexDirection: "column", gap: 6 }}
                  >
                    {SIGNATURE_FONTS.map((font) => (
                      <button
                        key={font}
                        className={`tab-btn${
                          vm.typedSigFont === font ? " active" : ""
                        }`}
                        style={{
                          fontFamily: `"${font}", cursive`,
                          fontSize: 22,
                          padding: "6px 12px",
                          textAlign: "left",
                        }}
                        onClick={() => {
                          vm.setTypedSigFont(font);
                          if (vm.typedName) setTimeout(vm.renderTypedSig, 50);
                        }}
                        aria-pressed={vm.typedSigFont === font}
                        aria-label={`Use ${font} font`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>
                {vm.typedName && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.renderTypedSig}
                  >
                    Preview signature
                  </button>
                )}
              </div>
            )}

            {/* Upload method */}
            {vm.method === "upload" && (
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  PNG or JPEG, max {vm.MAX_SIG_MB} MB
                </p>
                <FileDropZone
                  accept={SIG_IMG_ACCEPT}
                  maxSizeMb={vm.MAX_SIG_MB}
                  onFilesAccepted={vm.handleSigImageDrop}
                  onError={(msg) => useAuroraStore.getState().failSession(msg)}
                  aria-label="Upload signature image"
                />
              </div>
            )}

            {/* Signature preview + place button */}
            {vm.sigDataUrl && (
              <div className="card-sm">
                <div className="label" style={{ marginBottom: 6 }}>
                  Signature preview
                </div>
                <img
                  src={vm.sigDataUrl}
                  alt="Signature"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 70,
                    background: "#fff",
                    borderRadius: 4,
                    padding: 4,
                  }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={vm.placeSignature}
                  style={{ marginTop: 8, width: "100%" }}
                  aria-label="Place signature on page"
                >
                  + Place on page {vm.pageIndex + 1}
                </button>
              </div>
            )}

            {/* Saved signatures panel */}
            {vm.savedSignatures.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Saved signatures ({vm.savedSignatures.length}/5)
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {vm.savedSignatures.map((sig) => (
                    <SavedSigItem
                      key={sig.id}
                      name={sig.name}
                      dataUrl={sig.dataUrl}
                      onSelect={() => vm.loadSavedSig(sig)}
                      onDelete={() => vm.handleDeleteSavedSig(sig.id)}
                      onRename={(n) => vm.handleRenameSavedSig(sig.id, n)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Placed overlays list */}
            {vm.overlays.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Placed signatures ({vm.overlays.length})
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {vm.overlays.map((ov, idx) => (
                    <div
                      key={ov.id}
                      className="card-sm"
                      style={{
                        padding: "6px 8px",
                        cursor: "pointer",
                        border:
                          vm.selectedOverlayId === ov.id
                            ? "1px solid var(--green)"
                            : undefined,
                      }}
                      onClick={() => {
                        vm.setSelectedOverlayId(ov.id);
                        vm.setPageIndex(ov.pageIndex);
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "var(--text)" }}>
                          Sig {idx + 1} — Page {ov.pageIndex + 1}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "1px 5px",
                            fontSize: 11,
                            color: "var(--red, #e55)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            vm.removeOverlay(ov.id);
                          }}
                          aria-label={`Remove signature ${idx + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                      <img
                        src={ov.dataUrl}
                        alt={`Signature ${idx + 1}`}
                        style={{
                          width: "100%",
                          maxHeight: 36,
                          objectFit: "contain",
                          background: "#fff",
                          borderRadius: 3,
                          padding: 2,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-overlay controls: opacity + rotation */}
            {selectedOverlay && (
              <div
                className="card-sm"
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div className="label">
                  Signature{" "}
                  {vm.overlays.findIndex((o) => o.id === selectedOverlay.id) +
                    1}{" "}
                  controls
                </div>

                <div>
                  <label
                    className="label"
                    htmlFor={`opacity-${selectedOverlay.id}`}
                    style={{ marginBottom: 4 }}
                  >
                    Opacity: {selectedOverlay.opacity}%
                  </label>
                  <input
                    id={`opacity-${selectedOverlay.id}`}
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={selectedOverlay.opacity}
                    onChange={(e) =>
                      vm.setOverlayOpacity(
                        selectedOverlay.id,
                        Number(e.target.value),
                      )
                    }
                    style={{ width: "100%" }}
                    aria-label="Signature opacity"
                  />
                </div>

                <div>
                  <label
                    className="label"
                    htmlFor={`rotation-${selectedOverlay.id}`}
                    style={{ marginBottom: 4 }}
                  >
                    Rotation: {selectedOverlay.rotation}°
                  </label>
                  <input
                    id={`rotation-${selectedOverlay.id}`}
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={selectedOverlay.rotation}
                    onChange={(e) =>
                      vm.setOverlayRotation(
                        selectedOverlay.id,
                        Number(e.target.value),
                      )
                    }
                    style={{ width: "100%" }}
                    aria-label="Signature rotation"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="editor-sidebar-footer">
            <button
              className="btn btn-primary"
              onClick={vm.handleApply}
              disabled={vm.overlays.length === 0}
              aria-label="Apply all signatures"
            >
              Apply {vm.overlays.length > 0 ? `${vm.overlays.length} ` : ""}
              Signature{vm.overlays.length !== 1 ? "s" : ""}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
            >
              Change file
            </button>
          </div>
        </aside>

        {/* ── Canvas ── */}
        <div className="editor-canvas">
          <div className="editor-canvas-toolbar">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Page {vm.pageIndex + 1} of {vm.pageCount}
            </span>
            {vm.currentPageOverlays.length > 0 && (
              <span style={{ fontSize: 12, color: "var(--green)" }}>
                ✓ {vm.currentPageOverlays.length} signature
                {vm.currentPageOverlays.length !== 1 ? "s" : ""} on this page
              </span>
            )}
            {vm.sigDataUrl && vm.currentPageOverlays.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Click "+ Place on page" to add the signature
              </span>
            )}
          </div>

          {vm.pagePreviews[vm.pageIndex] ? (
            <div className="editor-page-wrap" style={{ cursor: "default" }}>
              <img
                src={vm.pagePreviews[vm.pageIndex]}
                alt={`Page ${vm.pageIndex + 1}`}
                style={{ display: "block", maxWidth: "min(860px, 100%)" }}
                draggable={false}
              />
              {vm.currentPageOverlays.map((ov) => (
                <SignatureOverlay
                  key={ov.id}
                  overlay={ov}
                  isSelected={vm.selectedOverlayId === ov.id}
                  onSelect={() => vm.setSelectedOverlayId(ov.id)}
                  beginOverlayDrag={vm.beginOverlayDrag}
                  moveOverlayDrag={vm.moveOverlayDrag}
                  endOverlayDrag={vm.endOverlayDrag}
                  beginOverlayResize={vm.beginOverlayResize}
                  moveOverlayResize={vm.moveOverlayResize}
                  endOverlayResize={vm.endOverlayResize}
                />
              ))}
            </div>
          ) : (
            <div
              style={{ color: "var(--text-muted)", fontSize: 14, padding: 60 }}
            >
              {vm.isLoading ? "Loading preview…" : "No preview available."}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
