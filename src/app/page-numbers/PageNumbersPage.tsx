import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { usePageNumbers } from "./hooks/usePageNumbers";
import type { PageNumberPosition, PageNumberFormat } from "@/types/tool.types";

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "top-center", label: "Top Center" },
];

const FORMATS: { value: PageNumberFormat; label: string }[] = [
  { value: "1", label: "1, 2, 3…" },
  { value: "Page 1", label: "Page 1, Page 2…" },
  { value: "1/N", label: "1/10, 2/10…" },
];

const FONTS = ["Helvetica", "Times New Roman", "Courier"];

export default function PageNumbersPage() {
  usePageTitle("Page Numbering");
  const vm = usePageNumbers();

  return (
    <ToolLayout toolName="Page Numbering">
      <div className="tool-header">
        <h1>🔢 Page Numbering</h1>
        <p>
          Add page numbers to your PDF with custom position, format, and style.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add page numbers"
          tool="page-numbers"
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
          {/* Config panel */}
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
              <label className="label">Position</label>
              <select
                className="select"
                value={vm.config.position}
                onChange={(e) =>
                  vm.update({ position: e.target.value as PageNumberPosition })
                }
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Format</label>
              <select
                className="select"
                value={vm.config.format}
                onChange={(e) =>
                  vm.update({ format: e.target.value as PageNumberFormat })
                }
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Font</label>
              <select
                className="select"
                value={vm.config.fontFamily}
                onChange={(e) => vm.update({ fontFamily: e.target.value })}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Font Size</label>
                <input
                  type="number"
                  className="input"
                  min={6}
                  max={72}
                  value={vm.config.fontSize}
                  onChange={(e) =>
                    vm.update({ fontSize: parseInt(e.target.value, 10) || 10 })
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Color</label>
                <input
                  type="color"
                  value={vm.config.color}
                  onChange={(e) => vm.update({ color: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            <div>
              <label className="label">Starting Number</label>
              <input
                type="number"
                className="input"
                min={1}
                value={vm.config.startingNumber}
                onChange={(e) =>
                  vm.update({
                    startingNumber: parseInt(e.target.value, 10) || 1,
                  })
                }
                style={{ maxWidth: 120 }}
              />
            </div>

            <div>
              <label className="label">Page Range (optional)</label>
              <input
                type="text"
                className="input"
                placeholder={`e.g. 2-${vm.pageCount} (leave blank for all)`}
                value={vm.config.pageRange}
                onChange={(e) => vm.update({ pageRange: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                aria-label="Add page numbers"
              >
                🔢 Add Page Numbers
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          </div>

          {/* Preview */}
          {vm.preview && (
            <div className="preview-panel" style={{ flex: "0 0 260px" }}>
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
          tool="page-numbers"
        />
      )}
    </ToolLayout>
  );
}
