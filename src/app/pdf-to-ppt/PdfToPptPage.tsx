import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePdfToPpt } from "./hooks/usePdfToPpt";

export default function PdfToPptPage() {
  usePageTitle("PDF to PowerPoint");
  const vm = usePdfToPpt();

  return (
    <ToolLayout toolName="PDF to PowerPoint">
      <div className="tool-header">
        <h1>📊 PDF to PowerPoint</h1>
        <p>
          Convert each PDF page to a slide image. Downloads as a ZIP of JPEG
          slides.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to convert to slides"
          tool="pdf-to-ppt"
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

          {/* DPI selector */}
          <div style={{ maxWidth: 420 }}>
            <label className="label">Slide Resolution (DPI)</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {vm.DPI_OPTIONS.map((d) => (
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
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
            >
              {vm.dpi === 96 && "Screen quality — fastest, smallest file size"}
              {vm.dpi === 150 && "Good quality — recommended for presentations"}
              {vm.dpi === 300 &&
                "High quality — best for printing, larger files"}
            </p>
          </div>

          <div
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--text-2)",
              maxWidth: 480,
            }}
          >
            ℹ️ Each PDF page is rasterized to a JPEG image. The output is a ZIP
            archive of slide images — one per page.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Convert to slides"
            >
              📊 Convert to Slides
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
          tool="pdf-to-ppt"
        />
      )}
    </ToolLayout>
  );
}
