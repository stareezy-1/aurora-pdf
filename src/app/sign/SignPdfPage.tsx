import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useSignPdf } from "./hooks/useSignPdf";
import type { SignatureMethod } from "@/types/tool.types";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const SIG_IMG_ACCEPT = [
  { mime: "image/png", extension: ".png" },
  { mime: "image/jpeg", extension: ".jpg" },
];

export default function SignPdfPage() {
  usePageTitle("Sign PDF");
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
            onDownload={vm.clearWorkbox}
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
                  style={{ fontFamily: "Georgia, serif", fontSize: 20 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.renderTypedSig}
                  disabled={!vm.typedName}
                >
                  Preview signature
                </button>
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
                <div
                  className="editor-overlay-item selected"
                  style={{
                    left: vm.overlay.x,
                    top: vm.overlay.y,
                    width: vm.overlay.width,
                    height: vm.overlay.height,
                  }}
                  onMouseDown={vm.startOverlayDrag}
                >
                  <img
                    src={vm.sigDataUrl}
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
                    onMouseDown={vm.startOverlayResize}
                  />
                </div>
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
