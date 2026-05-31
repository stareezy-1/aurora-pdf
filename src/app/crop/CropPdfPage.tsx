import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useCropPdf, type CropUnit } from "./hooks/useCropPdf";

export default function CropPdfPage() {
  usePageTitle("Crop PDF");
  const vm = useCropPdf();

  return (
    <ToolLayout toolName="Crop PDF">
      <div className="tool-header">
        <h1>✂️ Crop PDF</h1>
        <p>Remove margins from PDF pages by specifying crop amounts.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to crop"
          tool="crop"
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

            {/* Unit toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Unit:
              </span>
              {(["pt", "mm"] as CropUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`btn btn-sm ${
                    vm.unit === u ? "btn-primary" : "btn-secondary"
                  }`}
                  onClick={() => vm.setUnit(u)}
                >
                  {u}
                </button>
              ))}
            </div>

            {/* Margin inputs — visual layout matching page edges */}
            <div>
              <label className="label">Crop Margins</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  maxWidth: 280,
                }}
              >
                {/* Top row */}
                <div />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    Top
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    step={vm.unit === "mm" ? 0.5 : 1}
                    value={vm.displayValue(vm.config.top)}
                    onChange={(e) =>
                      vm.updateMargin("top", parseFloat(e.target.value) || 0)
                    }
                    style={{ textAlign: "center" }}
                    aria-label="Top crop margin"
                  />
                </div>
                <div />

                {/* Middle row */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    Left
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    step={vm.unit === "mm" ? 0.5 : 1}
                    value={vm.displayValue(vm.config.left)}
                    onChange={(e) =>
                      vm.updateMargin("left", parseFloat(e.target.value) || 0)
                    }
                    style={{ textAlign: "center" }}
                    aria-label="Left crop margin"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--surface-3)",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    padding: 8,
                  }}
                >
                  Page
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    Right
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    step={vm.unit === "mm" ? 0.5 : 1}
                    value={vm.displayValue(vm.config.right)}
                    onChange={(e) =>
                      vm.updateMargin("right", parseFloat(e.target.value) || 0)
                    }
                    style={{ textAlign: "center" }}
                    aria-label="Right crop margin"
                  />
                </div>

                {/* Bottom row */}
                <div />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    Bottom
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    step={vm.unit === "mm" ? 0.5 : 1}
                    value={vm.displayValue(vm.config.bottom)}
                    onChange={(e) =>
                      vm.updateMargin("bottom", parseFloat(e.target.value) || 0)
                    }
                    style={{ textAlign: "center" }}
                    aria-label="Bottom crop margin"
                  />
                </div>
                <div />
              </div>
            </div>

            <div>
              <label className="label">Page Range (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 1-5 (leave blank for all)"
                value={vm.config.pageRange}
                onChange={(e) => vm.update({ pageRange: e.target.value })}
              />
            </div>

            {vm.validationError && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--red, #ef4444)",
                  margin: 0,
                }}
              >
                ⚠ {vm.validationError}
              </p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                aria-label="Crop PDF"
              >
                ✂️ Crop PDF
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
          tool="crop"
        />
      )}
    </ToolLayout>
  );
}
