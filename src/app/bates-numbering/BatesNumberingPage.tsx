import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useBatesNumbering, BATES_POSITIONS } from "./hooks/useBatesNumbering";
import type { BatesPosition } from "@/engines/organization-engine";

export default function BatesNumberingPage() {
  usePageTitle("Bates Numbering");
  const vm = useBatesNumbering();

  return (
    <ToolLayout toolName="Bates Numbering">
      <div className="tool-header">
        <h1>🔢 Bates Numbering</h1>
        <p>Stamp sequential Bates numbers across one or more PDF files.</p>
      </div>

      <FileDropZone
        accept={vm.PDF_ACCEPT}
        multiple
        onFilesAccepted={vm.handleFileDrop}
        onError={(msg) => useAuroraStore.getState().failSession(msg)}
        aria-label="Drop PDF files for Bates numbering"
        tool="bates-numbering"
      />

      {vm.files.length > 0 && vm.status === "idle" && (
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
            marginTop: 16,
          }}
        >
          {/* Left: file list + config */}
          <div
            style={{
              flex: "1 1 320px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* File list */}
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
                  Files ({vm.files.length}/{vm.MAX_FILES})
                </label>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={vm.handleReset}
                  style={{ fontSize: 12 }}
                >
                  Clear all
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vm.files.map((bf, idx) => (
                  <div
                    key={bf.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
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
                      {idx + 1}.
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      📄 {bf.file.name}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.removeFile(bf.id)}
                      style={{
                        fontSize: 11,
                        color: "var(--red, #ef4444)",
                        padding: "2px 6px",
                      }}
                      aria-label={`Remove ${bf.file.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Format config */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="label">Bates Format</label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 100px" }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Prefix
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder='e.g. "DOC-"'
                    value={vm.config.prefix ?? ""}
                    onChange={(e) => vm.update({ prefix: e.target.value })}
                  />
                </div>
                <div style={{ flex: "0 0 80px" }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Digits
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={10}
                    value={vm.config.digits ?? 6}
                    onChange={(e) =>
                      vm.update({ digits: parseInt(e.target.value, 10) || 6 })
                    }
                  />
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Suffix
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder='e.g. "-A"'
                    value={vm.config.suffix ?? ""}
                    onChange={(e) => vm.update({ suffix: e.target.value })}
                  />
                </div>
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
                    Start #
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    value={vm.config.startNumber ?? 1}
                    onChange={(e) =>
                      vm.update({
                        startNumber: parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                </div>
                <div style={{ flex: "0 0 60px" }}>
                  <label
                    style={{
                      fontSize: 11,
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
                    min={6}
                    max={24}
                    value={vm.config.fontSize ?? 9}
                    onChange={(e) =>
                      vm.update({ fontSize: parseInt(e.target.value, 10) || 9 })
                    }
                  />
                </div>
                <div style={{ flex: "0 0 60px" }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Color
                  </label>
                  <input
                    type="color"
                    value={vm.config.color ?? "#000000"}
                    onChange={(e) => vm.update({ color: e.target.value })}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Position
                </label>
                <select
                  className="select"
                  value={vm.config.position ?? "bottom-right"}
                  onChange={(e) =>
                    vm.update({ position: e.target.value as BatesPosition })
                  }
                >
                  {BATES_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Preview:{" "}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    color: "var(--green)",
                  }}
                >
                  {vm.previewLabel}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                disabled={vm.files.length === 0}
                aria-label="Apply Bates numbering"
              >
                🔢 Apply Bates Numbers
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Clear all
              </button>
            </div>

            {vm.files.length > 1 && (
              <p
                style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}
              >
                Multiple files will be downloaded as a ZIP archive.
              </p>
            )}
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
          tool="bates-numbering"
        />
      )}
    </ToolLayout>
  );
}
