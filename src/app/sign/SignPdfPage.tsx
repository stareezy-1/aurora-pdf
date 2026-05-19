import { useEffect } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useDragOverlay } from "@/hooks/useDragOverlay";
import { useSignPdf, SIGNATURE_FONTS } from "./hooks/useSignPdf";
import type { SignatureMethod } from "@/types/tool.types";
import type { SigOverlay } from "./hooks/useSignPdf";

// Load Google Fonts for signature type mode
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Great+Vibes&display=swap";

function useGoogleFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);
}

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const SIG_IMG_ACCEPT = [
  { mime: "image/png", extension: ".png" },
  { mime: "image/jpeg", extension: ".jpg" },
];

// ── SignatureOverlay sub-component ───────────────────────────────────────────
// Hooks (useDragOverlay) must be called at component level, not inside render.
interface SignatureOverlayProps {
  overlay: SigOverlay;
  sigDataUrl: string;
  beginOverlayDrag: (e: React.MouseEvent | React.TouchEvent) => void;
  moveOverlayDrag: (delta: { dx: number; dy: number }) => void;
  endOverlayDrag: () => void;
  beginOverlayResize: (e: React.MouseEvent | React.TouchEvent) => void;
  moveOverlayResize: (delta: { dx: number; dy: number }) => void;
  endOverlayResize: () => void;
}

function SignatureOverlay({
  overlay,
  sigDataUrl,
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

  function handleDragMouseDown(e: React.MouseEvent) {
    beginOverlayDrag(e);
    dragHandlers.onMouseDown(e);
  }

  function handleDragTouchStart(e: React.TouchEvent) {
    beginOverlayDrag(e);
    dragHandlers.onTouchStart(e);
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    beginOverlayResize(e);
    resizeHandlers.onMouseDown(e);
  }

  function handleResizeTouchStart(e: React.TouchEvent) {
    e.stopPropagation();
    beginOverlayResize(e);
    resizeHandlers.onTouchStart(e);
  }

  return (
    <div
      className="editor-overlay-item selected"
      style={{
        left: overlay.x,
        top: overlay.y,
        width: overlay.width,
        height: overlay.height,
      }}
      onMouseDown={handleDragMouseDown}
      onTouchStart={handleDragTouchStart}
    >
      <img
        src={sigDataUrl}
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
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
      />
    </div>
  );
}

export default function SignPdfPage() {
  usePageTitle("Sign PDF");
  useGoogleFonts();
  const vm = useSignPdf();

  if (!vm.pdfFile || vm.status !== "idle") {
    return (
      <ToolLayout toolName="Sign PDF">
        <div className="tool-header">
          <h1>✍️ Sign PDF</h1>
          <p>Add a digital signature to any page. Draw, type, or upload.</p>
        </div>
        {vm.status === "idle" && (
          <FileDropZone
            accept={PDF_ACCEPT}
            onFilesAccepted={vm.handlePdfDrop}
            onError={(msg) => useAuroraStore.getState().failSession(msg)}
            aria-label="Drop a PDF to sign"
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
    <ToolLayout toolName="Sign PDF" wide>
      <div className="editor-shell">
        {/* Sidebar */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">✍️ Sign PDF</div>
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
              <label className="label" htmlFor="page-select">
                Sign page
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

            {/* Use previous signature */}
            {vm.savedSigDataUrl && !vm.sigDataUrl && (
              <div
                className="card-sm"
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div className="label">Previous signature</div>
                <img
                  src={vm.savedSigDataUrl}
                  alt="Saved signature"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 50,
                    background: "#fff",
                    borderRadius: 4,
                    padding: 4,
                    objectFit: "contain",
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.loadSavedSignature}
                  aria-label="Use previous signature"
                >
                  Use previous signature
                </button>
              </div>
            )}

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
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 6,
                  }}
                >
                  Drag the overlay on the page to reposition
                </p>
              </div>
            )}
          </div>

          <div className="editor-sidebar-footer">
            <button
              className="btn btn-primary"
              onClick={() => vm.pdfFile && vm.processor.run(vm.pdfFile)}
              disabled={!vm.sigDataUrl}
              aria-label="Apply signature"
            >
              Apply Signature
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
              Page {vm.pageIndex + 1} of {vm.pageCount}
            </span>
            {vm.sigDataUrl && (
              <span style={{ fontSize: 12, color: "var(--green)" }}>
                ✓ Signature ready — drag to reposition
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
              {vm.sigDataUrl && (
                <SignatureOverlay
                  overlay={vm.overlay}
                  sigDataUrl={vm.sigDataUrl}
                  beginOverlayDrag={vm.beginOverlayDrag}
                  moveOverlayDrag={vm.moveOverlayDrag}
                  endOverlayDrag={vm.endOverlayDrag}
                  beginOverlayResize={vm.beginOverlayResize}
                  moveOverlayResize={vm.moveOverlayResize}
                  endOverlayResize={vm.endOverlayResize}
                />
              )}
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
