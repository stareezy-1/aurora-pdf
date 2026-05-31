import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfToGreyscale } from "./hooks/usePdfToGreyscale";

export default function PdfToGreyscalePage() {
  usePageTitle("PDF to Greyscale");
  const vm = usePdfToGreyscale();

  return (
    <ToolLayout toolName="PDF to Greyscale">
      <div className="tool-header">
        <h1>🎨 PDF to Greyscale</h1>
        <p>
          Convert a color PDF to greyscale. Reduces file size and ink usage when
          printing.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to convert to greyscale"
          tool="pdf-to-greyscale"
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
            <label className="label" htmlFor="grey-range">
              Page Range (optional)
            </label>
            <input
              id="grey-range"
              type="text"
              className="input"
              placeholder={`e.g. 1-3,5 (total: ${vm.pageCount} pages)`}
              value={vm.pageRange}
              onChange={(e) => vm.setPageRange(e.target.value)}
            />
            <p
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
            >
              Leave blank to convert all pages. Pages outside the range are kept
              as-is.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Convert to greyscale"
            >
              🎨 Convert to Greyscale
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
          tool="pdf-to-greyscale"
        />
      )}
    </ToolLayout>
  );
}
