import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useRemoveMetadata } from "./hooks/useRemoveMetadata";

export default function RemoveMetadataPage() {
  usePageTitle("Remove Metadata");
  const vm = useRemoveMetadata();

  return (
    <ToolLayout toolName="Remove Metadata">
      <div className="tool-header">
        <h1>🗑️ Remove Metadata</h1>
        <p>
          Strip all XMP and DocInfo metadata fields from your PDF to remove
          identifying information. All processing happens locally.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to remove metadata"
          tool="remove-metadata"
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

          <div
            style={{
              padding: "12px 16px",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text)",
              }}
            >
              Fields that will be cleared:
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px 16px",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              {[
                "Title",
                "Author",
                "Subject",
                "Keywords",
                "Creator",
                "Producer",
                "Creation Date",
                "Modification Date",
                "XMP Metadata Stream",
              ].map((field) => (
                <span key={field}>• {field}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.processor.isPending}
              aria-label="Remove all metadata"
              aria-busy={vm.processor.isPending}
            >
              🗑️ Remove Metadata
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
        <>
          {vm.fieldsRemoved !== null && (
            <div
              style={{
                padding: "10px 16px",
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.3)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                marginBottom: 12,
              }}
              aria-live="polite"
            >
              ✅ Removed <strong>{vm.fieldsRemoved}</strong> metadata field
              {vm.fieldsRemoved !== 1 ? "s" : ""}. Zero fields remain.
            </div>
          )}
          <PrivacyShield
            variant="card"
            status={vm.status}
            outputFilename={vm.outputFilename ?? undefined}
            blobUrl={vm.resultBlobUrl}
            onDownload={vm.clearWorkbox}
            onReset={vm.handleReset}
            tool="remove-metadata"
          />
        </>
      )}
    </ToolLayout>
  );
}
