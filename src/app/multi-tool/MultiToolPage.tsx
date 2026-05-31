import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useMultiTool } from "./hooks/useMultiTool";

export default function MultiToolPage() {
  usePageTitle("PDF Multi Tool");
  const vm = useMultiTool();

  return (
    <ToolLayout toolName="PDF Multi Tool">
      <style>{`
        .multi-thumb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 14px;
        }
        @media (max-width: 600px) {
          .multi-thumb-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
        }
        .multi-drop-indicator {
          width: 3px;
          background: var(--green);
          border-radius: 2px;
          align-self: stretch;
          pointer-events: none;
        }
      `}</style>

      <div className="tool-header">
        <h1>🛠️ PDF Multi Tool</h1>
        <p>
          Reorder, rotate, duplicate, delete, and add blank pages — all in one
          place.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to edit with Multi Tool"
          tool="multi-tool"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {vm.pages.length} page{vm.pages.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
            >
              Change file
            </button>
          </div>

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <button className="btn btn-secondary btn-sm" onClick={vm.selectAll}>
              Select All
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.deselectAll}
              disabled={vm.selectedKeys.size === 0}
            >
              Deselect All
            </button>

            {vm.selectedKeys.size > 0 && (
              <>
                <span
                  style={{
                    width: 1,
                    height: 20,
                    background: "var(--border)",
                    display: "inline-block",
                  }}
                  aria-hidden="true"
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {vm.selectedKeys.size} selected
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => vm.rotateSelected(90)}
                  aria-label="Rotate selected 90°"
                >
                  ↻ 90°
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => vm.rotateSelected(180)}
                  aria-label="Rotate selected 180°"
                >
                  ↻ 180°
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.deleteSelected}
                  style={{ color: "var(--red, #ef4444)" }}
                  aria-label="Delete selected pages"
                  disabled={vm.selectedKeys.size >= vm.pages.length}
                >
                  🗑 Delete
                </button>
              </>
            )}
          </div>

          {/* Thumbnail grid */}
          {vm.pages.length > 0 ? (
            <div
              className="multi-thumb-grid"
              role="list"
              aria-label="PDF pages"
            >
              {vm.pages.map((page, idx) => (
                <div key={page.key} style={{ display: "contents" }}>
                  {vm.dropIndex === idx && (
                    <div
                      className="multi-drop-indicator"
                      aria-hidden="true"
                      style={{ gridRow: "span 1" }}
                    />
                  )}
                  <div
                    role="listitem"
                    draggable
                    onDragStart={() => vm.handleDragStart(idx)}
                    onDragOver={(e) => vm.handleDragOver(e, idx)}
                    onDrop={() => vm.handleDrop(idx)}
                    onDragEnd={vm.handleDragEnd}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey || e.shiftKey)
                        vm.toggleSelect(page.key);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: 8,
                      borderRadius: "var(--radius-md)",
                      border: vm.selectedKeys.has(page.key)
                        ? "2px solid var(--green)"
                        : vm.dragOver === idx
                        ? "2px solid var(--green)"
                        : "1px solid var(--border)",
                      background: vm.selectedKeys.has(page.key)
                        ? "rgba(0,255,136,0.08)"
                        : vm.dragSrc === idx
                        ? "rgba(0,255,136,0.04)"
                        : "var(--surface-2)",
                      cursor: "grab",
                      userSelect: "none",
                      position: "relative",
                    }}
                    aria-label={`Page ${idx + 1}${
                      vm.selectedKeys.has(page.key) ? " (selected)" : ""
                    }`}
                    aria-selected={vm.selectedKeys.has(page.key)}
                  >
                    {/* Rotation badge */}
                    {page.rotation !== 0 && (
                      <div
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
                          zIndex: 2,
                        }}
                      >
                        ↻ {page.rotation}°
                      </div>
                    )}

                    {/* Checkbox */}
                    <div
                      role="checkbox"
                      aria-checked={vm.selectedKeys.has(page.key)}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        vm.toggleSelect(page.key);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          vm.toggleSelect(page.key);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: vm.selectedKeys.has(page.key)
                          ? "2px solid var(--green)"
                          : "2px solid var(--border-2, #444)",
                        background: vm.selectedKeys.has(page.key)
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
                      {vm.selectedKeys.has(page.key) ? "✓" : ""}
                    </div>

                    {/* Thumbnail */}
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "0.707",
                        overflow: "hidden",
                        borderRadius: "var(--radius-sm)",
                        background: page.srcIndex === -1 ? "#f0f0f0" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {page.srcIndex === -1 ? (
                        <span style={{ fontSize: 24, color: "#ccc" }}>📄</span>
                      ) : page.thumb ? (
                        <img
                          src={page.thumb}
                          alt={`Page ${idx + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            transform: `rotate(${page.rotation}deg)`,
                            transition: "transform 0.2s",
                          }}
                          draggable={false}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: "#aaa" }}>…</span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {page.srcIndex === -1 ? "Blank" : `Page ${idx + 1}`}
                    </span>

                    {/* Per-card actions */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 3,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => vm.rotatePage(page.key, 90)}
                        title="Rotate 90°"
                        style={{ fontSize: 10, padding: "2px 5px" }}
                      >
                        ↻90°
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => vm.duplicatePage(page.key)}
                        title="Duplicate"
                        style={{ fontSize: 10, padding: "2px 5px" }}
                      >
                        ⧉
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => vm.addBlankPage(page.key)}
                        title="Add blank after"
                        style={{ fontSize: 10, padding: "2px 5px" }}
                      >
                        +□
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => vm.deletePage(page.key)}
                        title="Delete"
                        style={{
                          fontSize: 10,
                          padding: "2px 5px",
                          color: "var(--red, #ef4444)",
                        }}
                        disabled={vm.pages.length <= 1}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {vm.dropIndex === vm.pages.length && (
                <div className="multi-drop-indicator" aria-hidden="true" />
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

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleExport}
              disabled={vm.pages.length === 0}
              aria-label="Export PDF"
            >
              💾 Export PDF ({vm.pages.length} pages)
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Change file
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
          onDownload={() => useAuroraStore.getState().clearWorkbox()}
          onReset={vm.handleReset}
          tool="multi-tool"
        />
      )}
    </ToolLayout>
  );
}
