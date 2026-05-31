import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useExtractPages } from "./hooks/useExtractPages";

export default function ExtractPagesPage() {
  usePageTitle("Extract Pages");
  const vm = useExtractPages();

  return (
    <ToolLayout toolName="Extract Pages">
      <div className="tool-header">
        <h1>📄 Extract Pages</h1>
        <p>Extract specific pages from a PDF into a new document.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to extract pages from"
          tool="extract-pages"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {vm.pageCount} page{vm.pageCount !== 1 ? "s" : ""}
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

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="label" htmlFor="page-range-input">
              Page Range
            </label>
            <input
              id="page-range-input"
              type="text"
              className="input"
              placeholder={`e.g. 1-3,5,7-9 (total: ${vm.pageCount} pages)`}
              value={vm.pageRange}
              onChange={(e) => vm.handleRangeChange(e.target.value)}
              aria-describedby={vm.rangeError ? "range-error" : undefined}
              aria-invalid={!!vm.rangeError}
              style={{ maxWidth: 400 }}
            />
            {vm.rangeError && (
              <p
                id="range-error"
                style={{
                  fontSize: 12,
                  color: "var(--red, #ef4444)",
                  margin: 0,
                }}
              >
                ⚠ {vm.rangeError}
              </p>
            )}
            {vm.selectedPages.length > 0 && !vm.rangeError && (
              <p style={{ fontSize: 12, color: "var(--green)", margin: 0 }}>
                ✓ {vm.selectedPages.length} page
                {vm.selectedPages.length !== 1 ? "s" : ""} selected:{" "}
                {vm.selectedPages.join(", ")}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleExtract}
              disabled={!vm.pageRange.trim() || !!vm.rangeError}
              aria-label="Extract pages"
            >
              📄 Extract Pages
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
          tool="extract-pages"
        />
      )}
    </ToolLayout>
  );
}
