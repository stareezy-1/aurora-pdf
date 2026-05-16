import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useOrganizePdf } from "./hooks/useOrganizePdf";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export default function OrganizePdfPage() {
  usePageTitle("Organize PDF");
  const vm = useOrganizePdf();

  return (
    <ToolLayout toolName="Organize PDF">
      <div className="tool-header">
        <h1>🗂️ Organize PDF</h1>
        <p>
          Reorder, rotate, duplicate, or delete pages — then save your organized
          PDF.
        </p>
      </div>

      {!vm.pdfFile && vm.status === "idle" && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to organize"
        />
      )}

      {vm.pdfFile && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* File info strip */}
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.pdfFile.name}</div>
              <div className="file-size">
                {vm.pageOrder.length} page
                {vm.pageOrder.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
              aria-label="Change file"
            >
              Change file
            </button>
          </div>

          {/* Thumbnail grid */}
          {vm.thumbnails.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
              }}
              role="list"
              aria-label="PDF pages"
            >
              {vm.thumbnails.map((thumb, idx) => (
                <div
                  key={idx}
                  role="listitem"
                  draggable
                  onDragStart={() => vm.setDragSrc(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    vm.setDragOver(idx);
                  }}
                  onDrop={() => vm.handleThumbDrop(idx)}
                  onDragEnd={() => {
                    vm.setDragSrc(null);
                    vm.setDragOver(null);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 8,
                    borderRadius: "var(--radius-md)",
                    border:
                      vm.dragOver === idx
                        ? "2px solid var(--green)"
                        : "1px solid var(--border)",
                    background:
                      vm.dragSrc === idx
                        ? "rgba(0,255,136,0.06)"
                        : "var(--surface-2)",
                    cursor: "grab",
                    transition: "border-color 0.15s, background 0.15s",
                    userSelect: "none",
                  }}
                  aria-label={`Page ${idx + 1}`}
                >
                  {/* Page thumbnail */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "0.707",
                      overflow: "hidden",
                      borderRadius: "var(--radius-sm)",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={thumb}
                      alt={`Page ${idx + 1} thumbnail`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Page number */}
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Page {idx + 1}
                  </span>

                  {/* Action buttons */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    {/* Undo — only shown when this page was the last action */}
                    {vm.history.length > 0 && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={vm.handleUndo}
                        aria-label="Undo last action"
                        title="Undo"
                        style={{
                          fontSize: 12,
                          padding: "3px 7px",
                          color: "var(--green)",
                        }}
                      >
                        ↩
                      </button>
                    )}
                    {/* Rotate buttons */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.handleRotatePage(idx, 90)}
                      aria-label={`Rotate page ${idx + 1} 90 degrees clockwise`}
                      title="Rotate 90°"
                      style={{ fontSize: 12, padding: "3px 7px" }}
                    >
                      ↻90°
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.handleRotatePage(idx, 180)}
                      aria-label={`Rotate page ${idx + 1} 180 degrees`}
                      title="Rotate 180°"
                      style={{ fontSize: 12, padding: "3px 7px" }}
                    >
                      ↻180°
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.handleRotatePage(idx, 270)}
                      aria-label={`Rotate page ${idx + 1} 270 degrees`}
                      title="Rotate 270°"
                      style={{ fontSize: 12, padding: "3px 7px" }}
                    >
                      ↻270°
                    </button>
                    {/* Duplicate button */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.handleDuplicatePage(idx)}
                      aria-label={`Duplicate page ${idx + 1}`}
                      title="Duplicate page"
                      style={{ fontSize: 12, padding: "3px 7px" }}
                    >
                      ⧉
                    </button>
                    {/* Delete button */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.handleDeletePage(idx)}
                      aria-label={`Delete page ${idx + 1}`}
                      title="Delete page"
                      style={{
                        fontSize: 12,
                        padding: "3px 7px",
                        color: "var(--red, #ff4444)",
                      }}
                      disabled={vm.pageOrder.length <= 1}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "32px 0",
              }}
            >
              Loading thumbnails…
            </div>
          )}

          {/* Save button */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleSave}
              disabled={vm.thumbnails.length === 0}
              aria-label="Save organized PDF"
            >
              💾 Save Organized PDF
            </button>
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
          onDownload={vm.clearWorkbox}
          onReset={vm.handleReset}
        />
      )}
    </ToolLayout>
  );
}
