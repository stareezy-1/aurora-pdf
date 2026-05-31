import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useRepairPdf } from "./hooks/useRepairPdf";

export default function RepairPdfPage() {
  usePageTitle("Repair PDF");
  const vm = useRepairPdf();

  const originalPages = vm.pageCount;
  const repairedPages = vm.repairedPageCount;
  const lostPages =
    repairedPages !== null && originalPages > 0
      ? Math.max(0, originalPages - repairedPages)
      : 0;

  return (
    <ToolLayout toolName="Repair PDF">
      <div className="tool-header">
        <h1>🔧 Repair PDF</h1>
        <p>
          Attempt to recover and reconstruct a corrupted or malformed PDF. All
          processing happens locally — your file never leaves your device.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to repair"
          tool="repair"
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
                {originalPages > 0 ? ` · ${originalPages} pages` : ""}
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
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            ℹ️ Repair works by reloading the PDF and rebuilding its internal
            structure. Pages that are too corrupted to recover will be lost.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.processor.isPending}
              aria-label="Repair PDF"
              aria-busy={vm.processor.isPending}
            >
              🔧 Repair PDF
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
          {repairedPages !== null && (
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
                ✅ Recovered: <strong>{repairedPages}</strong> page
                {repairedPages !== 1 ? "s" : ""}
              </div>
              {lostPages > 0 && (
                <div
                  style={{
                    padding: "10px 16px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                  }}
                >
                  ⚠️ Lost: <strong>{lostPages}</strong> page
                  {lostPages !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
          <PrivacyShield
            variant="card"
            status={vm.status}
            outputFilename={vm.outputFilename ?? undefined}
            blobUrl={vm.resultBlobUrl}
            onDownload={vm.clearWorkbox}
            onReset={vm.handleReset}
            tool="repair"
          />
        </>
      )}
    </ToolLayout>
  );
}
