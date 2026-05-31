import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfsToZip } from "./hooks/usePdfsToZip";

export default function PdfsToZipPage() {
  usePageTitle("PDFs to ZIP");
  const vm = usePdfsToZip();

  return (
    <ToolLayout toolName="PDFs to ZIP">
      <div className="tool-header">
        <h1>🗜️ PDFs to ZIP</h1>
        <p>
          Package multiple PDF files into a single ZIP archive. Rename files
          before packaging.
        </p>
      </div>

      <FileDropZone
        accept={vm.PDF_ACCEPT}
        multiple
        onFilesAccepted={vm.handleFileDrop}
        onError={(msg) => useAuroraStore.getState().failSession(msg)}
        aria-label="Drop PDF files to package into ZIP"
        tool="pdfs-to-zip"
      />

      {vm.entries.length > 0 && vm.status === "idle" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {vm.entries.length} file{vm.entries.length !== 1 ? "s" : ""} —
              rename before packaging
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Max {vm.MAX_FILES} files
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
            role="list"
            aria-label="Files to package"
          >
            {vm.entries.map((entry, idx) => (
              <div
                key={entry.id}
                role="listitem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    minWidth: 24,
                  }}
                >
                  {idx + 1}.
                </span>
                <span style={{ fontSize: 16 }}>📄</span>
                <input
                  type="text"
                  value={entry.customName}
                  onChange={(e) => vm.renameEntry(entry.id, e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    background: "var(--surface-3)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    padding: "4px 8px",
                  }}
                  aria-label={`Filename for file ${idx + 1}`}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(entry.file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => vm.removeEntry(entry.id)}
                  aria-label={`Remove ${entry.file.name}`}
                  style={{
                    color: "var(--red, #ff4444)",
                    fontSize: 12,
                    padding: "3px 8px",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {vm.entries.length < vm.MIN_FILES && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Add at least {vm.MIN_FILES} files to create a ZIP.
            </p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleCreate}
              disabled={vm.entries.length < vm.MIN_FILES}
              aria-label="Create ZIP archive"
            >
              🗜️ Create ZIP ({vm.entries.length} files)
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Clear all
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
          tool="pdfs-to-zip"
        />
      )}
    </ToolLayout>
  );
}
