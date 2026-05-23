import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { CompressionSizeEstimate } from "@/components/CompressionSizeEstimate/CompressionSizeEstimate";
import { BeforeAfterBar } from "@/components/BeforeAfterBar/BeforeAfterBar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { formatCompressionStats } from "@/lib/format-utils";
import type { CompressionLevel } from "@/types/tool.types";
import { useCompressPdf } from "./hooks/useCompressPdf";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

/** Quality dots: 5 dots total, filled count indicates quality (higher = better quality) */
const QUALITY_DOTS: Record<CompressionLevel, number> = {
  low: 5,
  standard: 3,
  high: 1,
};

const LEVEL_TOOLTIPS: Record<CompressionLevel, string> = {
  low: "Minimal compression — preserves original quality, reduces size by ~10–20%",
  standard: "Balanced — good quality reduction, reduces size by ~30–50%",
  high: "Maximum compression — noticeable quality loss, reduces size by ~50–70%",
};

const LEVELS: {
  value: CompressionLevel;
  label: string;
  desc: string;
  icon: string;
}[] = [
  {
    value: "low",
    label: "Low Compression",
    desc: "Best quality, smaller reduction",
    icon: "🟢",
  },
  {
    value: "standard",
    label: "Standard Compression",
    desc: "Balanced quality and size",
    icon: "🟡",
  },
  {
    value: "high",
    label: "High Compression",
    desc: "Smallest size, lower quality",
    icon: "🔴",
  },
];

function QualityDots({ level }: { level: CompressionLevel }) {
  const filled = QUALITY_DOTS[level];
  return (
    <span
      style={{ fontSize: 11, letterSpacing: 1, color: "var(--text-muted)" }}
      aria-label={`Quality: ${filled} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (i < filled ? "●" : "○")).join("")}
    </span>
  );
}

export default function CompressPdfPage() {
  usePageTitle("Compress PDF");
  const vm = useCompressPdf();

  return (
    <ToolLayout toolName="Compress PDF">
      <style>{`
        .compress-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .compress-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="tool-header">
        <h1>🗜️ Compress PDF</h1>
        <p>
          Reduce PDF file size while preserving readability. All processing is
          local.
        </p>
      </div>

      {vm.status === "idle" && !vm.pendingFile && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF file to compress"
          tool="compress"
        />
      )}

      {vm.status === "idle" && vm.pendingFile && (
        <div className="compress-grid">
          {/* Config */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="file-info-strip">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{vm.pendingFile.name}</div>
                <div className="file-size">
                  {(vm.pendingFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>

            <div>
              <label className="label">Compression level</label>
              <div className="radio-group">
                {LEVELS.map(({ value, label, desc, icon }) => (
                  <label
                    key={value}
                    className={`radio-option${
                      vm.level === value ? " selected" : ""
                    }`}
                    title={LEVEL_TOOLTIPS[value]}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={value}
                      checked={vm.level === value}
                      onChange={() => vm.setLevel(value)}
                    />
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {desc}
                      </div>
                      <QualityDots level={value} />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <CompressionSizeEstimate
              inputBytes={vm.pendingFile.size}
              level={vm.level}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => vm.processor.run(vm.pendingFile!)}
                aria-label="Compress PDF"
              >
                🗜️ Compress PDF
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="preview-panel">
            <div className="preview-panel-header">📄 Preview (page 1)</div>
            <div
              className="preview-panel-body"
              style={{ display: "flex", justifyContent: "center" }}
            >
              {vm.preview ? (
                <img
                  src={vm.preview}
                  alt="PDF preview"
                  style={{
                    maxWidth: "100%",
                    borderRadius: 4,
                    boxShadow: "var(--shadow-md)",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    padding: 40,
                  }}
                >
                  Loading…
                </div>
              )}
            </div>
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
        <>
          {vm.noReduction && (
            <div className="alert alert-warning" style={{ marginTop: 16 }}>
              ⚠ No size reduction achieved — original file offered for download.
            </div>
          )}
          {vm.stats && !vm.noReduction && (
            <>
              <div className="stats-card" style={{ marginTop: 16 }}>
                <div className="stat-item">
                  <div className="stat-label">Original</div>
                  <div className="stat-value">
                    {(vm.stats.original / 1024 / 1024).toFixed(2)}
                    <span style={{ fontSize: 12, fontWeight: 400 }}> MB</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Compressed</div>
                  <div className="stat-value">
                    {(vm.stats.compressed / 1024 / 1024).toFixed(2)}
                    <span style={{ fontSize: 12, fontWeight: 400 }}> MB</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Reduction</div>
                  <div className="stat-value green">
                    {formatCompressionStats(
                      vm.stats.original,
                      vm.stats.compressed,
                    )}
                  </div>
                </div>
              </div>
              <BeforeAfterBar
                originalBytes={vm.stats.original}
                compressedBytes={vm.stats.compressed}
              />
            </>
          )}
          <PrivacyShield
            variant="card"
            status={vm.status}
            outputFilename={vm.outputFilename ?? undefined}
            blobUrl={vm.resultBlobUrl}
            onDownload={vm.clearWorkbox}
            onReset={vm.handleReset}
            tool="compress"
          />
        </>
      )}
    </ToolLayout>
  );
}
