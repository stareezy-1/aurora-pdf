import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useReversePages } from "./hooks/useReversePages";

export default function ReversePagesPage() {
  usePageTitle("Reverse Pages");
  const vm = useReversePages();

  return (
    <ToolLayout toolName="Reverse Pages">
      <div className="tool-header">
        <h1>🔃 Reverse Pages</h1>
        <p>Reverse the order of all pages or a specific page range.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to reverse pages"
          tool="reverse-pages"
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
              gap: 8,
              maxWidth: 400,
            }}
          >
            <label className="label" htmlFor="reverse-range">
              Page Range (optional — leave blank to reverse all)
            </label>
            <input
              id="reverse-range"
              type="text"
              className="input"
              placeholder={`e.g. 1-5 (total: ${vm.pageCount} pages)`}
              value={vm.pageRange}
              onChange={(e) => vm.setPageRange(e.target.value)}
            />
            {vm.rangeError && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--red, #ef4444)",
                  margin: 0,
                }}
              >
                ⚠ {vm.rangeError}
              </p>
            )}
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              {vm.pageRange.trim()
                ? `Will reverse pages in range: ${vm.pageRange}`
                : `Will reverse all ${vm.pageCount} pages`}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              aria-label="Reverse pages"
            >
              🔃 Reverse Pages
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
          tool="reverse-pages"
        />
      )}
    </ToolLayout>
  );
}
