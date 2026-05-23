import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useExcelToPdf } from "./hooks/useExcelToPdf";

const XLSX_ACCEPT = [
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
  { mime: "application/vnd.ms-excel", extension: ".xls" },
];

export default function ExcelToPdfPage() {
  usePageTitle("Excel to PDF");
  const vm = useExcelToPdf();

  return (
    <ToolLayout toolName="Excel to PDF">
      <div className="tool-header">
        <h1>📋 Excel to PDF</h1>
        <p>Convert an Excel spreadsheet into a fixed, print-ready PDF.</p>
      </div>

      {vm.status === "idle" && !vm.pendingFile && (
        <FileDropZone
          accept={XLSX_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop an Excel file to convert to PDF"
          tool="excel-to-pdf"
        />
      )}

      {vm.status === "idle" && vm.pendingFile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {vm.sheetCount > 10 && (
            <div className="alert alert-warning">
              ⚠ This workbook has {vm.sheetCount} worksheets. All will be
              included — the output PDF may be large.
            </div>
          )}
          <div className="file-info-strip">
            <span className="file-icon">📊</span>
            <div>
              <div className="file-name">{vm.pendingFile.name}</div>
              <div className="file-size">
                {vm.sheetCount} sheet{vm.sheetCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => vm.processor.run(vm.pendingFile!)}
              aria-label="Convert Excel to PDF"
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
          tool="excel-to-pdf"
        />
      )}
    </ToolLayout>
  );
}
