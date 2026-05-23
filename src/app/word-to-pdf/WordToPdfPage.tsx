import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWordToPdf } from "./hooks/useWordToPdf";

const DOCX_ACCEPT = [
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
  },
];

export default function WordToPdfPage() {
  usePageTitle("Word to PDF");
  const vm = useWordToPdf();

  return (
    <ToolLayout toolName="Word to PDF">
      <div className="tool-header">
        <h1>📄 Word to PDF</h1>
        <p>Convert a Word document into a universally readable PDF file.</p>
      </div>

      {vm.status === "idle" && !vm.pendingFile && (
        <FileDropZone
          accept={DOCX_ACCEPT}
          onFilesAccepted={(files) => vm.setPendingFile(files[0])}
          onError={vm.handleError}
          aria-label="Drop a .docx file to convert to PDF"
          tool="word-to-pdf"
        />
      )}

      {vm.status === "idle" && vm.pendingFile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="file-info-strip">
            <span className="file-icon">📝</span>
            <div className="file-name">{vm.pendingFile.name}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => vm.processor.run(vm.pendingFile!)}
              aria-label="Convert Word to PDF"
            >
              Convert to PDF
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
          tool="word-to-pdf"
        />
      )}
    </ToolLayout>
  );
}
