import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useTextToPdf } from "./hooks/useTextToPdf";

const FONT_OPTIONS = ["Helvetica", "Times-Roman", "Courier"];
const PAGE_SIZES = ["A4", "Letter", "Legal"] as const;

export default function TextToPdfPage() {
  usePageTitle("Text to PDF");
  const vm = useTextToPdf();

  return (
    <ToolLayout toolName="Text to PDF">
      <style>{`
        .text-pdf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .text-pdf-grid { grid-template-columns: 1fr; }
        }
        .text-pdf-field { display: flex; flex-direction: column; gap: 4px; }
        .text-pdf-field label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
      `}</style>

      <div className="tool-header">
        <h1>📄 Text to PDF</h1>
        <p>
          Convert a plain text file to a formatted PDF with custom typography
          and layout.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.TXT_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a .txt file to convert to PDF"
          tool="text-to-pdf"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📝</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {(vm.file.size / 1024).toFixed(1)} KB
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

          <div style={{ maxWidth: 480 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: 12,
              }}
            >
              Typography &amp; Layout
            </p>
            <div className="text-pdf-grid">
              {/* Font family */}
              <div className="text-pdf-field">
                <label htmlFor="txt-font">Font</label>
                <select
                  id="txt-font"
                  className="input"
                  value={vm.fontFamily}
                  onChange={(e) => vm.setFontFamily(e.target.value)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font size */}
              <div className="text-pdf-field">
                <label htmlFor="txt-size">Font Size (pt)</label>
                <input
                  id="txt-size"
                  type="number"
                  className="input"
                  min={6}
                  max={72}
                  value={vm.fontSize}
                  onChange={(e) => vm.setFontSize(Number(e.target.value))}
                />
              </div>

              {/* Line spacing */}
              <div className="text-pdf-field">
                <label htmlFor="txt-spacing">Line Spacing</label>
                <input
                  id="txt-spacing"
                  type="number"
                  className="input"
                  min={1}
                  max={3}
                  step={0.1}
                  value={vm.lineSpacing}
                  onChange={(e) => vm.setLineSpacing(Number(e.target.value))}
                />
              </div>

              {/* Page size */}
              <div className="text-pdf-field">
                <label htmlFor="txt-pagesize">Page Size</label>
                <select
                  id="txt-pagesize"
                  className="input"
                  value={vm.pageSize}
                  onChange={(e) =>
                    vm.setPageSize(e.target.value as "A4" | "Letter" | "Legal")
                  }
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              <div className="text-pdf-field">
                <label htmlFor="txt-orient">Orientation</label>
                <select
                  id="txt-orient"
                  className="input"
                  value={vm.orientation}
                  onChange={(e) =>
                    vm.setOrientation(
                      e.target.value as "portrait" | "landscape",
                    )
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              {/* Margin */}
              <div className="text-pdf-field">
                <label htmlFor="txt-margin">Margin (pt)</label>
                <input
                  id="txt-margin"
                  type="number"
                  className="input"
                  min={0}
                  max={200}
                  value={vm.marginTop}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    vm.setMarginTop(v);
                    vm.setMarginRight(v);
                    vm.setMarginBottom(v);
                    vm.setMarginLeft(v);
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Convert to PDF"
            >
              📄 Convert to PDF
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
          tool="text-to-pdf"
        />
      )}
    </ToolLayout>
  );
}
