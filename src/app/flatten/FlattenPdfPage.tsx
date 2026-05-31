import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useFlattenPdf } from "./hooks/useFlattenPdf";

export default function FlattenPdfPage() {
  usePageTitle("Flatten PDF");
  const vm = useFlattenPdf();

  return (
    <ToolLayout toolName="Flatten PDF">
      <div className="tool-header">
        <h1>📄 Flatten PDF</h1>
        <p>
          Merge form fields and annotations into static page content, producing
          a non-editable final version. All processing happens locally.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to flatten"
          tool="flatten"
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
                {vm.pageCount > 0 ? ` · ${vm.pageCount} pages` : ""}
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
              background: "rgba(0,204,255,0.06)",
              border: "1px solid rgba(0,204,255,0.2)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            ℹ️ Flattening removes all interactive form fields and annotation
            layers, embedding them as static content. This action cannot be
            undone.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.processor.isPending}
              aria-label="Flatten PDF"
              aria-busy={vm.processor.isPending}
            >
              📄 Flatten PDF
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
          {vm.flattenStats !== null && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  background: "rgba(0,255,136,0.08)",
                  border: "1px solid rgba(0,255,136,0.3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                📝 Form fields flattened:{" "}
                <strong>{vm.flattenStats.fields}</strong>
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  background: "rgba(0,204,255,0.08)",
                  border: "1px solid rgba(0,204,255,0.3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                💬 Annotations flattened:{" "}
                <strong>{vm.flattenStats.annotations}</strong>
              </div>
            </div>
          )}
          <PrivacyShield
            variant="card"
            status={vm.status}
            outputFilename={vm.outputFilename ?? undefined}
            blobUrl={vm.resultBlobUrl}
            onDownload={vm.clearWorkbox}
            onReset={vm.handleReset}
            tool="flatten"
          />
        </>
      )}
    </ToolLayout>
  );
}
