import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import type { DpiOption } from "@/types/tool.types";
import { usePdfToJpg } from "./hooks/usePdfToJpg";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export default function PdfToJpgPage() {
  usePageTitle("PDF to JPG");
  const vm = usePdfToJpg();

  return (
    <ToolLayout toolName="PDF to JPG">
      <div className="tool-header">
        <h1>🖼️ PDF to JPG</h1>
        <p>Convert each PDF page into a high-resolution JPEG image.</p>
      </div>

      {vm.status === "idle" && (
        <>
          <FileDropZone
            accept={PDF_ACCEPT}
            onFilesAccepted={([f]) => vm.processor.run(f)}
            onError={(msg) => useAuroraStore.getState().failSession(msg)}
            aria-label="Drop a PDF to convert to JPG"
          />
          <div style={{ marginTop: 20 }}>
            <label className="label">Output resolution</label>
            <div className="tab-group" style={{ maxWidth: 280 }}>
              {([150, 300] as DpiOption[]).map((d) => (
                <button
                  key={d}
                  className={`tab-btn${vm.dpi === d ? " active" : ""}`}
                  onClick={() => vm.setDpi(d)}
                  aria-pressed={vm.dpi === d}
                >
                  {d} DPI {d === 150 ? "(default)" : "(high res)"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={vm.clearWorkbox}
      />
      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={vm.clearWorkbox}
          onReset={vm.clearWorkbox}
        />
      )}
    </ToolLayout>
  );
}
