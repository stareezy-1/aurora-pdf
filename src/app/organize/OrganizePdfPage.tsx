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
      {/* Mobile-responsive grid style injected via <style> tag */}
      <style>{`
        .organize-thumb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        @media (max-width: 768px) {
          .organize-thumb-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
          }
          .organize-thumb-card {
            min-width: 100px;
            min-height: 133px;
          }
        }
        .organize-drop-indicator {
          width: 2px;
          background: var(--green);
          border-radius: 2px;
          align-self: stretch;
          flex-shrink: 0;
          pointer-events: none;
        }
      `}</style>

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

          {/* Toolbar above grid */}
          {vm.thumbnails.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              {/* Select All / Deselect All */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleSelectAll}
                aria-label="Select all pages"
              >
                Select All
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleDeselectAll}
                aria-label="Deselect all pages"
                disabled={vm.selectedIds.size === 0}
              >
                Deselect All
              </button>

              {/* Undo last action — single button above grid */}
              {vm.history.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.handleUndo}
                  aria-label="Undo last action"
                  title="Undo last action"
                  style={{ color: "var(--green)" }}
                >
                  ↩ Undo last action
                </button>
              )}

              {/* Bulk action toolbar — shown when pages are selected */}
              {vm.selectedIds.size > 0 && (
                <>
                  <span
                    style={{
                      width: 1,
                      height: 24,
                      background: "var(--border)",
                      display: "inline-block",
                    }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vm.selectedIds.size} selected
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.handleBulkDelete}
                    aria-label="Delete selected pages"
                    disabled={vm.selectedIds.size >= vm.pageOrder.length}
                    style={{ color: "var(--red, #ff4444)" }}
                  >
                    🗑 Delete selected
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.handleBulkRotateLeft}
                    aria-label="Rotate selected pages left 90 degrees"
                    title="Rotate left (−90°)"
                  >
                    ↺ Rotate left
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.handleBulkRotateRight}
                    aria-label="Rotate selected pages right 90 degrees"
                    title="Rotate right (+90°)"
                  >
                    ↻ Rotate right
                  </button>
                </>
              )}
            </div>
          )}

          {/* Thumbnail grid */}
          {vm.thumbnails.length > 0 ? (
            <div
              className="organize-thumb-grid"
              role="list"
              aria-label="PDF pages"
            >
              {vm.thumbnails.map((thumb, idx) => (
                <div key={idx} style={{ display: "contents" }}>
                  {/* Drop indicator before this card */}
                  {vm.dropIndex === idx && (
                    <div
                      className="organize-drop-indicator"
                      aria-hidden="true"
                      style={{ gridRow: "span 1" }}
                    />
                  )}

                  <div
                    role="listitem"
                    className="organize-thumb-card"
                    draggable
                    onDragStart={() => {
                      vm.setDragSrc(idx);
                      vm.setDropIndex(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      vm.setDragOver(idx);
                      // Determine drop position: before or after based on mouse X
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      const midX = rect.left + rect.width / 2;
                      vm.setDropIndex(e.clientX < midX ? idx : idx + 1);
                    }}
                    onDrop={() => {
                      vm.handleThumbDrop(idx);
                    }}
                    onDragEnd={() => {
                      vm.setDragSrc(null);
                      vm.setDragOver(null);
                      vm.setDropIndex(null);
                    }}
                    onClick={(e) => {
                      // Toggle selection on click (Ctrl/Cmd or Shift for multi-select)
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        vm.handleToggleSelect(idx);
                      }
                    }}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: 8,
                      borderRadius: "var(--radius-md)",
                      border: vm.selectedIds.has(idx)
                        ? "2px solid var(--green)"
                        : vm.dragOver === idx
                        ? "2px solid var(--green)"
                        : "1px solid var(--border)",
                      background: vm.selectedIds.has(idx)
                        ? "rgba(0,255,136,0.08)"
                        : vm.dragSrc === idx
                        ? "rgba(0,255,136,0.06)"
                        : "var(--surface-2)",
                      cursor: "grab",
                      transition: "border-color 0.15s, background 0.15s",
                      userSelect: "none",
                      outline: vm.selectedIds.has(idx) ? "none" : undefined,
                    }}
                    aria-label={`Page ${idx + 1}${
                      vm.selectedIds.has(idx) ? " (selected)" : ""
                    }`}
                    aria-selected={vm.selectedIds.has(idx)}
                  >
                    {/* Rotation badge overlay */}
                    {vm.rotations[idx] !== undefined &&
                      vm.rotations[idx] !== 0 && (
                        <div
                          aria-label={`Rotated ${vm.rotations[idx]}°`}
                          style={{
                            position: "absolute",
                            top: 3,
                            left: 3,
                            background: "rgba(0,0,0,0.65)",
                            color: "var(--green)",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 4px",
                            borderRadius: "var(--radius-sm)",
                            lineHeight: 1.4,
                            pointerEvents: "none",
                            zIndex: 2,
                          }}
                        >
                          ↻ {vm.rotations[idx]}°
                        </div>
                      )}

                    {/* Selection checkbox indicator */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        vm.handleToggleSelect(idx);
                      }}
                      aria-label={
                        vm.selectedIds.has(idx)
                          ? `Deselect page ${idx + 1}`
                          : `Select page ${idx + 1}`
                      }
                      role="checkbox"
                      aria-checked={vm.selectedIds.has(idx)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          vm.handleToggleSelect(idx);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: vm.selectedIds.has(idx)
                          ? "2px solid var(--green)"
                          : "2px solid var(--border-2, #444)",
                        background: vm.selectedIds.has(idx)
                          ? "var(--green)"
                          : "rgba(0,0,0,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 2,
                        fontSize: 11,
                        color: "#000",
                        fontWeight: 700,
                      }}
                    >
                      {vm.selectedIds.has(idx) ? "✓" : ""}
                    </div>

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
                      className="thumb-num"
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      Page {idx + 1}
                    </span>

                    {/* Per-card action buttons */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        justifyContent: "center",
                      }}
                    >
                      {/* Rotate buttons */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => vm.handleRotatePage(idx, 90)}
                        aria-label={`Rotate page ${
                          idx + 1
                        } 90 degrees clockwise`}
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
                </div>
              ))}

              {/* Drop indicator at the end of the list */}
              {vm.dropIndex === vm.thumbnails.length && (
                <div className="organize-drop-indicator" aria-hidden="true" />
              )}
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
