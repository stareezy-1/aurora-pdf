import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useAddBlankPages } from "./hooks/useAddBlankPages";

export default function AddBlankPagesPage() {
  usePageTitle("Add Blank Pages");
  const vm = useAddBlankPages();

  return (
    <ToolLayout toolName="Add Blank Pages">
      <div className="tool-header">
        <h1>📃 Add Blank Pages</h1>
        <p>Insert a blank page at any position in your PDF.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add blank pages"
          tool="add-blank-pages"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              flex: "1 1 300px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
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

            <div>
              <label className="label" htmlFor="insert-position">
                Insert After Page (0 = before first page)
              </label>
              <input
                id="insert-position"
                type="number"
                className="input"
                min={0}
                max={vm.pageCount}
                value={vm.config.position}
                onChange={(e) =>
                  vm.update({
                    position: Math.max(
                      0,
                      Math.min(vm.pageCount, parseInt(e.target.value, 10) || 0),
                    ),
                  })
                }
                style={{ maxWidth: 120 }}
              />
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Range: 0 (before page 1) to {vm.pageCount} (after last page)
              </p>
            </div>

            <div>
              <label className="label">Page Size</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["A4", "Letter", "Legal"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`btn ${
                      vm.config.pageSize === size
                        ? "btn-primary"
                        : "btn-secondary"
                    } btn-sm`}
                    onClick={() => vm.update({ pageSize: size })}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Orientation</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`btn ${
                      vm.config.orientation === o
                        ? "btn-primary"
                        : "btn-secondary"
                    } btn-sm`}
                    onClick={() => vm.update({ orientation: o })}
                  >
                    {o === "portrait" ? "📄 Portrait" : "🖼️ Landscape"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                aria-label="Insert blank page"
              >
                📃 Insert Blank Page
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          </div>

          {vm.preview && (
            <div className="preview-panel" style={{ flex: "0 0 240px" }}>
              <div className="preview-panel-header">📄 Preview</div>
              <div
                className="preview-panel-body"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <img
                  src={vm.preview}
                  alt="PDF preview"
                  style={{ maxWidth: "100%", borderRadius: 4 }}
                />
              </div>
            </div>
          )}
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
          tool="add-blank-pages"
        />
      )}
    </ToolLayout>
  );
}
