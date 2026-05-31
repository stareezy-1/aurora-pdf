import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useMetadataEditor } from "./hooks/useMetadataEditor";
import type { PdfMetadata } from "./hooks/useMetadataEditor";

const EDITABLE_FIELDS: Array<{ key: keyof PdfMetadata; label: string }> = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords" },
];

const READONLY_FIELDS: Array<{ key: keyof PdfMetadata; label: string }> = [
  { key: "creator", label: "Creator" },
  { key: "producer", label: "Producer" },
  { key: "creationDate", label: "Creation Date" },
  { key: "modDate", label: "Modification Date" },
];

export default function MetadataEditorPage() {
  usePageTitle("Metadata Editor");
  const vm = useMetadataEditor();

  return (
    <ToolLayout toolName="Metadata Editor">
      <div className="tool-header">
        <h1>🏷️ Metadata Editor</h1>
        <p>
          View and edit PDF document properties like title, author, subject, and
          keywords. All processing happens locally.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to edit metadata"
          tool="metadata"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {(vm.file.size / 1024).toFixed(1)} KB
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

          {vm.isLoading ? (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              ⏳ Reading metadata…
            </div>
          ) : (
            <>
              {/* Editable fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    className="label"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    Editable Fields
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={vm.handleClearAll}
                    aria-label="Clear all metadata fields"
                  >
                    🗑 Clear All
                  </button>
                </div>
                {EDITABLE_FIELDS.map(({ key, label }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    <label className="label" htmlFor={`meta-${key}`}>
                      {label}
                    </label>
                    <input
                      id={`meta-${key}`}
                      className="input-field"
                      type="text"
                      value={vm.editedMetadata[key]}
                      onChange={(e) => vm.updateField(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}…`}
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>

              {/* Read-only fields */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="label"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  Read-only Fields
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px 16px",
                  }}
                >
                  {READONLY_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginBottom: 2,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: vm.editedMetadata[key]
                            ? "var(--text)"
                            : "var(--text-muted)",
                          wordBreak: "break-all",
                        }}
                      >
                        {vm.editedMetadata[key] || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={vm.handleSave}
                  disabled={vm.processor.isPending}
                  aria-label="Save metadata"
                  aria-busy={vm.processor.isPending}
                >
                  💾 Save Metadata
                </button>
                <button className="btn btn-secondary" onClick={vm.handleReset}>
                  Change file
                </button>
              </div>
            </>
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
          onDownload={vm.clearWorkbox}
          onReset={vm.handleReset}
          tool="metadata"
        />
      )}
    </ToolLayout>
  );
}
