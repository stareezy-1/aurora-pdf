import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePageLabels, LABEL_STYLES } from "./hooks/usePageLabels";
import type { PageLabelStyle } from "@/engines/organization-engine";

export default function PageLabelsPage() {
  usePageTitle("Add Page Labels");
  const vm = usePageLabels();

  return (
    <ToolLayout toolName="Add Page Labels">
      <div className="tool-header">
        <h1>🏷️ Add Page Labels</h1>
        <p>
          Assign custom label ranges (Roman numerals, letters, prefixes) to page
          groups.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add page labels"
          tool="page-labels"
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
          <div
            style={{
              flex: "1 1 340px",
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
                  Label Ranges
                </label>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.addRange}
                >
                  + Add Range
                </button>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {vm.ranges.map((range, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        Range {i + 1}
                      </span>
                      {vm.ranges.length > 1 && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => vm.deleteRange(i)}
                          style={{
                            fontSize: 11,
                            color: "var(--red, #ef4444)",
                            padding: "2px 8px",
                          }}
                          aria-label={`Remove range ${i + 1}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: "0 0 100px" }}>
                        <label
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Start Page (0-based)
                        </label>
                        <input
                          type="number"
                          className="input"
                          min={0}
                          max={vm.pageCount - 1}
                          value={range.startPage}
                          onChange={(e) =>
                            vm.updateRange(i, {
                              startPage: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          aria-label={`Start page for range ${i + 1}`}
                        />
                      </div>
                      <div style={{ flex: "1 1 160px" }}>
                        <label
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Style
                        </label>
                        <select
                          className="select"
                          value={range.style}
                          onChange={(e) =>
                            vm.updateRange(i, {
                              style: e.target.value as PageLabelStyle,
                            })
                          }
                          aria-label={`Label style for range ${i + 1}`}
                        >
                          {LABEL_STYLES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 120px" }}>
                        <label
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Prefix (optional)
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder='e.g. "App-"'
                          value={range.prefix ?? ""}
                          onChange={(e) =>
                            vm.updateRange(i, { prefix: e.target.value })
                          }
                          aria-label={`Prefix for range ${i + 1}`}
                        />
                      </div>
                      <div style={{ flex: "0 0 90px" }}>
                        <label
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Start at
                        </label>
                        <input
                          type="number"
                          className="input"
                          min={1}
                          value={range.startAt ?? 1}
                          onChange={(e) =>
                            vm.updateRange(i, {
                              startAt: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          aria-label={`Starting number for range ${i + 1}`}
                        />
                      </div>
                    </div>

                    {/* Preview label */}
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--green)",
                        fontFamily: "monospace",
                      }}
                    >
                      Preview: {range.prefix ?? ""}
                      {range.style === "arabic"
                        ? range.startAt ?? 1
                        : range.style === "roman-upper"
                        ? "I"
                        : range.style === "roman-lower"
                        ? "i"
                        : range.style === "alpha-upper"
                        ? "A"
                        : range.style === "alpha-lower"
                        ? "a"
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                disabled={vm.ranges.length === 0}
                aria-label="Apply page labels"
              >
                🏷️ Apply Labels
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
          tool="page-labels"
        />
      )}
    </ToolLayout>
  );
}
