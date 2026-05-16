import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfToExcel } from "./hooks/usePdfToExcel";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export default function PdfToExcelPage() {
  usePageTitle("PDF to Excel");
  const vm = usePdfToExcel();

  return (
    <ToolLayout toolName="PDF to Excel">
      <div className="tool-header">
        <h1>📊 PDF to Excel</h1>
        <p>
          Extract tabular data from a PDF into an editable Excel spreadsheet.
        </p>
      </div>

      {vm.status === "idle" && !vm.pendingFile && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={(files) => {
            vm.setNoTables(false);
            vm.setPendingFile(files[0]);
          }}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to extract tables"
        />
      )}

      {vm.status === "idle" && vm.pendingFile && !vm.noTables && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div className="file-name">{vm.pendingFile.name}</div>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => vm.processor.run(vm.pendingFile!)}
            aria-label="Extract tables from PDF"
            style={{ width: "fit-content" }}
          >
            Extract Tables
          </button>
        </div>
      )}

      {vm.noTables && (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              No tables detected
            </div>
            <div>
              No tabular data was found in this PDF. No output file was
              produced.
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
