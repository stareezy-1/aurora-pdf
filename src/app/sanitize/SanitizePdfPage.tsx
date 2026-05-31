import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useSanitizePdf } from "./hooks/useSanitizePdf";

export default function SanitizePdfPage() {
  usePageTitle("Sanitize PDF");
  const vm = useSanitizePdf();

  return (
    <ToolLayout toolName="Sanitize PDF">
      <div className="tool-header">
        <h1>🧹 Sanitize PDF</h1>
        <p>
          Remove metadata, annotations, JavaScript, and embedded attachments
          from your PDF. All processing happens locally.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to sanitize"
          tool="sanitize"
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

          {/* What will be removed */}
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
                marginBottom: 10,
                color: "var(--text)",
              }}
            >
              What will be removed:
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 13,
                color: "var(--text-muted)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <li>
                Document metadata (Title, Author, Subject, Keywords, etc.)
              </li>
              <li>XMP metadata stream</li>
              <li>All annotations (highlights, notes, stamps, etc.)</li>
              <li>JavaScript actions and triggers</li>
              <li>Embedded file attachments</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.processor.isPending}
              aria-label="Sanitize PDF"
              aria-busy={vm.processor.isPending}
            >
              🧹 Sanitize PDF
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
          {vm.sanitizeStats !== null && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
                marginBottom: 12,
              }}
              aria-label="Sanitization summary"
            >
              <div
                style={{
                  padding: "10px 14px",
                  background: vm.sanitizeStats.removedMetadata
                    ? "rgba(0,255,136,0.08)"
                    : "var(--surface-2)",
                  border: `1px solid ${
                    vm.sanitizeStats.removedMetadata
                      ? "rgba(0,255,136,0.3)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                🏷️ Metadata{" "}
                <strong>
                  {vm.sanitizeStats.removedMetadata ? "removed" : "none found"}
                </strong>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  background:
                    vm.sanitizeStats.removedAnnotations > 0
                      ? "rgba(0,255,136,0.08)"
                      : "var(--surface-2)",
                  border: `1px solid ${
                    vm.sanitizeStats.removedAnnotations > 0
                      ? "rgba(0,255,136,0.3)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                💬 Annotations:{" "}
                <strong>{vm.sanitizeStats.removedAnnotations}</strong>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  background: vm.sanitizeStats.removedJavaScript
                    ? "rgba(0,255,136,0.08)"
                    : "var(--surface-2)",
                  border: `1px solid ${
                    vm.sanitizeStats.removedJavaScript
                      ? "rgba(0,255,136,0.3)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                ⚡ JavaScript{" "}
                <strong>
                  {vm.sanitizeStats.removedJavaScript
                    ? "removed"
                    : "none found"}
                </strong>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  background:
                    vm.sanitizeStats.removedAttachments > 0
                      ? "rgba(0,255,136,0.08)"
                      : "var(--surface-2)",
                  border: `1px solid ${
                    vm.sanitizeStats.removedAttachments > 0
                      ? "rgba(0,255,136,0.3)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                }}
              >
                📎 Attachments:{" "}
                <strong>{vm.sanitizeStats.removedAttachments}</strong>
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
            tool="sanitize"
          />
        </>
      )}
    </ToolLayout>
  );
}
