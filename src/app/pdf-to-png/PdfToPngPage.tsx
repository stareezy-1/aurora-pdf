import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfToPng } from "./hooks/usePdfToPng";

const DPI_OPTIONS = [72, 96, 150, 300] as const;

export default function PdfToPngPage() {
  usePageTitle("PDF to PNG");
  const vm = usePdfToPng();

  return (
    <ToolLayout toolName="PDF to PNG">
      <div className="tool-header">
        <h1>🖼️ PDF to PNG</h1>
        <p>
          Convert each PDF page to a high-quality PNG image. Download as a ZIP
          archive.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to convert to PNG"
          tool="pdf-to-png"
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxWidth: 420,
            }}
          >
            {/* DPI selector */}
            <div>
              <label className="label">Resolution (DPI)</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 6,
                }}
              >
                {DPI_OPTIONS.map((d) => (
                  <button
                    key={d}
                    className={`btn btn-sm ${
                      vm.dpi === d ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => vm.setDpi(d)}
                    aria-pressed={vm.dpi === d}
                  >
                    {d} DPI
                  </button>
                ))}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                {vm.dpi === 72 && "Screen quality — smallest file size"}
                {vm.dpi === 96 && "Standard screen quality"}
                {vm.dpi === 150 && "Good quality — recommended"}
                {vm.dpi === 300 && "Print quality — largest file size"}
              </p>
            </div>

            {/* Page range */}
            <div>
              <label className="label" htmlFor="png-range">
                Page Range (optional)
              </label>
              <input
                id="png-range"
                type="text"
                className="input"
                placeholder={`e.g. 1-3,5 (total: ${vm.pageCount} pages)`}
                value={vm.pageRange}
                onChange={(e) => vm.setPageRange(e.target.value)}
              />
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Leave blank to convert all pages
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Convert to PNG"
            >
              🖼️ Convert to PNG
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
          tool="pdf-to-png"
        />
      )}
    </ToolLayout>
  );
}
