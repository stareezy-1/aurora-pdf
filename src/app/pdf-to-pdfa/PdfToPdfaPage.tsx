import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfToPdfa } from "./hooks/usePdfToPdfa";

export default function PdfToPdfaPage() {
  usePageTitle("PDF to PDF/A");
  const vm = usePdfToPdfa();

  return (
    <ToolLayout toolName="PDF to PDF/A">
      <div className="tool-header">
        <h1>📦 PDF to PDF/A</h1>
        <p>
          Convert a PDF to the archival PDF/A format for long-term preservation.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to convert to PDF/A"
          tool="pdf-to-pdfa"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

          <div style={{ maxWidth: 420 }}>
            <label className="label">PDF/A Variant</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {(["1b", "2b"] as const).map((v) => (
                <button
                  key={v}
                  className={`btn btn-sm ${
                    vm.variant === v ? "btn-primary" : "btn-secondary"
                  }`}
                  onClick={() => vm.setVariant(v)}
                  aria-pressed={vm.variant === v}
                >
                  PDF/A-{v.toUpperCase()}
                </button>
              ))}
            </div>
            <p
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}
            >
              {vm.variant === "1b"
                ? "PDF/A-1B — ISO 19005-1. Widest compatibility. Embeds fonts, removes JavaScript and encryption."
                : "PDF/A-2B — ISO 19005-2. Supports transparency and JPEG 2000. Recommended for modern documents."}
            </p>
          </div>

          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--text-2)",
              maxWidth: 420,
            }}
          >
            ⚠️ PDF/A conversion removes JavaScript, external references, and
            encryption. Interactive features will be lost.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Convert to PDF/A"
            >
              📦 Convert to PDF/A
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
          tool="pdf-to-pdfa"
        />
      )}
    </ToolLayout>
  );
}
