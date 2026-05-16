import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfToWord } from "./hooks/usePdfToWord";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export default function PdfToWordPage() {
  usePageTitle("PDF to Word");
  const vm = usePdfToWord();

  return (
    <ToolLayout toolName="PDF to Word">
      <div className="tool-header">
        <h1>📝 PDF to Word</h1>
        <p>
          Extract text and structure from a PDF into an editable Word document.
        </p>
      </div>

      {vm.preflight === "idle" && vm.status === "idle" && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to convert to Word"
        />
      )}

      {vm.preflight === "checking" && (
        <div
          style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 16 }}
        >
          ⏳ Checking PDF…
        </div>
      )}

      {vm.preflight === "no-text" && (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Image-based PDF detected
            </div>
            <div>
              This PDF has no embedded text layer. Use the{" "}
              <strong>OCR tool</strong> first to extract text, then convert.
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginTop: 10 }}
            >
              Try another file
            </button>
          </div>
        </div>
      )}

      {vm.preflight === "ready" && vm.status === "idle" && vm.pendingFile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div className="file-name">{vm.pendingFile.name}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => vm.processor.run(vm.pendingFile!)}
              aria-label="Convert PDF to Word"
            >
              Convert to Word
            </button>
            <button
              className="btn btn-secondary"
              onClick={vm.handleReset}
              aria-label="Choose a different file"
            >
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
          onDownload={vm.clearWorkbox}
          onReset={vm.handleReset}
        />
      )}
    </ToolLayout>
  );
}
