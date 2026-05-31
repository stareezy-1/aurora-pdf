import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useTableOfContents } from "./hooks/useTableOfContents";

const FONTS = ["Helvetica", "Times New Roman", "Courier"];

export default function TableOfContentsPage() {
  usePageTitle("Table of Contents");
  const vm = useTableOfContents();

  return (
    <ToolLayout toolName="Table of Contents">
      <div className="tool-header">
        <h1>📑 Table of Contents</h1>
        <p>
          Generate a TOC page from a bookmark list and insert it into your PDF.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add a table of contents"
          tool="table-of-contents"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {/* Left: entries + config */}
          <div
            style={{
              flex: "1 1 320px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div className="file-info-strip">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{vm.file.name}</div>
                <div className="file-size">{vm.pageCount} pages</div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
                style={{ marginLeft: "auto" }}
              >
                Change file
              </button>
            </div>

            {/* TOC entries */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label className="label" style={{ margin: 0 }}>
                  TOC Entries ({vm.bookmarks.length})
                </label>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.addBookmark}
                >
                  + Add Entry
                </button>
              </div>

              {vm.bookmarks.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border)",
                    fontSize: 13,
                  }}
                >
                  Add entries to generate a TOC.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {vm.bookmarks.map((bm, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          minWidth: 20,
                        }}
                      >
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        value={bm.title}
                        onChange={(e) =>
                          vm.updateBookmark(i, { title: e.target.value })
                        }
                        style={{
                          flex: 1,
                          fontSize: 13,
                          background: "transparent",
                          border: "none",
                          color: "var(--text)",
                          outline: "none",
                        }}
                        aria-label={`TOC entry ${i + 1} title`}
                      />
                      <span
                        style={{ fontSize: 11, color: "var(--text-muted)" }}
                      >
                        p.
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={vm.pageCount}
                        value={bm.pageIndex + 1}
                        onChange={(e) =>
                          vm.updateBookmark(i, {
                            pageIndex:
                              Math.max(0, parseInt(e.target.value, 10) - 1) ||
                              0,
                          })
                        }
                        style={{
                          width: 52,
                          fontSize: 12,
                          textAlign: "center",
                          background: "var(--surface-3)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text)",
                          padding: "2px 4px",
                        }}
                        aria-label={`Page for entry ${i + 1}`}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => vm.deleteBookmark(i)}
                        style={{
                          padding: "2px 6px",
                          fontSize: 11,
                          color: "var(--red, #ef4444)",
                        }}
                        aria-label={`Remove entry ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TOC config */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="label">TOC Settings</label>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 120px" }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Insert at page
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    max={vm.pageCount}
                    value={vm.tocConfig.insertAtPage}
                    onChange={(e) =>
                      vm.updateConfig({
                        insertAtPage: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    style={{ maxWidth: 80 }}
                  />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Font
                  </label>
                  <select
                    className="select"
                    value={vm.tocConfig.fontFamily ?? "Helvetica"}
                    onChange={(e) =>
                      vm.updateConfig({ fontFamily: e.target.value })
                    }
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "0 0 70px" }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Size
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={8}
                    max={24}
                    value={vm.tocConfig.fontSize ?? 11}
                    onChange={(e) =>
                      vm.updateConfig({
                        fontSize: parseInt(e.target.value, 10) || 11,
                      })
                    }
                  />
                </div>
                <div style={{ flex: "0 0 90px" }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Line spacing
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={3}
                    step={0.1}
                    value={vm.tocConfig.lineSpacing ?? 1.5}
                    onChange={(e) =>
                      vm.updateConfig({
                        lineSpacing: parseFloat(e.target.value) || 1.5,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                disabled={vm.bookmarks.length === 0}
                aria-label="Generate table of contents"
              >
                📑 Generate TOC
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          </div>

          {vm.preview && (
            <div className="preview-panel" style={{ flex: "0 0 240px" }}>
              <div className="preview-panel-header">📄 Preview</div>
              <div
                className="preview-panel-body"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <img
                  src={vm.preview}
                  alt="PDF preview"
                  style={{ maxWidth: "100%", borderRadius: 4 }}
                />
              </div>
            </div>
          )}
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
          tool="table-of-contents"
        />
      )}
    </ToolLayout>
  );
}
