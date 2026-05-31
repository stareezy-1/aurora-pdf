import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { BeforeAfterBar } from "@/components/BeforeAfterBar/BeforeAfterBar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { formatCompressionStats } from "@/lib/format-utils";
import type { CondenseLevel, PresetName } from "@/types/compression.types";
import { useCompressPdf } from "./hooks/useCompressPdf";

// ── Sub-components ──────────────────────────────────────────────────────────

const CONDENSE_LEVELS: {
  value: CondenseLevel;
  label: string;
  desc: string;
  icon: string;
}[] = [
  {
    value: "low",
    label: "Low",
    desc: "Minimal — preserves original quality",
    icon: "🟢",
  },
  {
    value: "recommended",
    label: "Recommended",
    desc: "Balanced quality and size reduction",
    icon: "🔵",
  },
  {
    value: "high",
    label: "High",
    desc: "Aggressive — noticeable quality reduction",
    icon: "🟡",
  },
  {
    value: "maximum",
    label: "Maximum",
    desc: "Smallest size, significant quality loss",
    icon: "🔴",
  },
  {
    value: "custom",
    label: "Custom",
    desc: "Fine-tune compression settings manually",
    icon: "⚙️",
  },
];

const PRESETS: {
  value: PresetName;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { value: "email", label: "Email", desc: "Target ≤ 1 MB", icon: "📧" },
  { value: "web", label: "Web", desc: "Target ≤ 2 MB", icon: "🌐" },
  { value: "mobile", label: "Mobile", desc: "Target ≤ 500 KB", icon: "📱" },
  { value: "print", label: "Print", desc: "Preserve quality", icon: "🖨️" },
  {
    value: "maximum",
    label: "Maximum Reduction",
    desc: "Smallest possible size",
    icon: "⚡",
  },
];

function QualityScore({ score }: { score: number }) {
  return (
    <span
      style={{ fontSize: 11, letterSpacing: 1, color: "var(--text-muted)" }}
      aria-label={`Quality score: ${score} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (i < score ? "●" : "○")).join("")}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface PhotonWarningModalProps {
  onAcknowledge: () => void;
  onDismiss: () => void;
}

function PhotonWarningModal({
  onAcknowledge,
  onDismiss,
}: PhotonWarningModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photon-warning-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          padding: 28,
          position: "relative",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>
          ⚠️
        </div>
        <h2
          id="photon-warning-title"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Photon Algorithm Warning
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-2)",
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          The <strong>Photon</strong> algorithm rasterizes each PDF page into an
          image. This produces smaller files for photo-heavy or scanned PDFs,
          but:
        </p>
        <ul
          style={{
            fontSize: 13,
            color: "var(--text-2)",
            lineHeight: 1.8,
            paddingLeft: 20,
            marginBottom: 20,
          }}
        >
          <li>
            Text will <strong>not be selectable</strong> in the output
          </li>
          <li>
            Hyperlinks will <strong>not be functional</strong>
          </li>
          <li>The output is a rasterized image — not a true PDF</li>
        </ul>
        <p
          style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}
        >
          Use <strong>Condense</strong> instead if you need selectable text or
          working links.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onDismiss}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onAcknowledge}>
            I Understand — Use Photon
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function CompressPdfPage() {
  usePageTitle("Compress PDF");
  const vm = useCompressPdf();

  const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

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
          .compress-grid { grid-template-columns: 1fr; }
        }
        .algo-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .algo-tab {
          flex: 1;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: var(--surface-2);
          color: var(--text-2);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .algo-tab.active {
          border-color: var(--green);
          background: rgba(0,255,136,0.08);
          color: var(--green);
        }
        .algo-tab:hover:not(.active) {
          border-color: var(--border-2);
          color: var(--text);
        }
        .preset-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .preset-chip {
          padding: 6px 12px;
          border-radius: var(--radius-full, 999px);
          border: 1.5px solid var(--border);
          background: var(--surface-2);
          color: var(--text-2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .preset-chip.active {
          border-color: var(--green);
          background: rgba(0,255,136,0.1);
          color: var(--green);
        }
        .preset-chip:hover:not(.active) {
          border-color: var(--border-2);
          color: var(--text);
        }
        .estimation-panel {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .estimation-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .estimation-stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        .estimation-stat-value {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }
        .estimation-stat-value.green { color: var(--green); }
        .batch-file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }
        .batch-file-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .batch-file-progress {
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: var(--surface-3);
          overflow: hidden;
        }
        .batch-file-progress-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, var(--green), #00ccff);
          transition: width 300ms ease;
        }
        .batch-file-progress-fill.error { background: var(--red, #ef4444); }
        .dpi-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dpi-chip {
          padding: 5px 12px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: var(--surface-2);
          color: var(--text-2);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dpi-chip.active {
          border-color: var(--green);
          background: rgba(0,255,136,0.08);
          color: var(--green);
        }
      `}</style>

      <div className="tool-header">
        <h1>🗜️ Compress PDF</h1>
        <p>
          Reduce PDF file size while preserving readability. All processing is
          local.
        </p>
      </div>

      {/* Mode toggle */}
      {vm.status === "idle" && !vm.file && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className={`btn ${
              !vm.isBatchMode ? "btn-primary" : "btn-secondary"
            }`}
            style={{ fontSize: 13 }}
            onClick={() => vm.setIsBatchMode(false)}
          >
            Single File
          </button>
          <button
            className={`btn ${
              vm.isBatchMode ? "btn-primary" : "btn-secondary"
            }`}
            style={{ fontSize: 13 }}
            onClick={() => vm.setIsBatchMode(true)}
          >
            Batch (up to {vm.BATCH_MAX_FILES} files)
          </button>
        </div>
      )}

      {/* ── Single file: drop zone ── */}
      {vm.status === "idle" && !vm.file && !vm.isBatchMode && (
        <FileDropZone
          accept={PDF_ACCEPT}
          onFilesAccepted={vm.handleDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF file to compress"
          tool="compress"
        />
      )}

      {/* ── Batch: drop zone ── */}
      {vm.isBatchMode && vm.batchFiles.length === 0 && !vm.batchComplete && (
        <FileDropZone
          accept={PDF_ACCEPT}
          multiple
          onFilesAccepted={vm.handleBatchDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop PDF files to compress in batch"
          tool="compress"
        />
      )}

      {/* ── Single file: config + preview ── */}
      {vm.status === "idle" && vm.file && !vm.isBatchMode && (
        <div className="compress-grid">
          {/* Left: config panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* File info */}
            <div className="file-info-strip">
              <span className="file-icon">📄</span>
              <div>
                <div className="file-name">{vm.file.name}</div>
                <div className="file-size">{formatBytes(vm.file.size)}</div>
              </div>
            </div>

            {/* Large file warning */}
            {vm.hasLargeFile && (
              <div className="alert alert-warning" style={{ fontSize: 13 }}>
                ⚠ This file exceeds 50 MB. Processing may be slow on the main
                thread.
              </div>
            )}

            {/* Presets */}
            <div>
              <label
                className="label"
                style={{ marginBottom: 8, display: "block" }}
              >
                Quick Presets
              </label>
              <div className="preset-grid">
                {PRESETS.map(({ value, label, desc, icon }) => (
                  <button
                    key={value}
                    className={`preset-chip${
                      vm.selectedPreset === value ? " active" : ""
                    }`}
                    onClick={() => vm.applyPreset(value)}
                    title={desc}
                    type="button"
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm selector */}
            <div>
              <label
                className="label"
                style={{ marginBottom: 8, display: "block" }}
              >
                Algorithm
              </label>
              <div className="algo-tabs">
                <button
                  type="button"
                  className={`algo-tab${
                    vm.algorithm === "condense" ? " active" : ""
                  }`}
                  onClick={() => vm.setAlgorithm("condense")}
                >
                  🔵 Condense
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "inherit",
                      opacity: 0.8,
                      marginTop: 2,
                    }}
                  >
                    Preserves text &amp; links
                  </div>
                </button>
                <button
                  type="button"
                  className={`algo-tab${
                    vm.algorithm === "photon" ? " active" : ""
                  }`}
                  onClick={() => vm.setAlgorithm("photon")}
                >
                  ⚡ Photon
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "inherit",
                      opacity: 0.8,
                      marginTop: 2,
                    }}
                  >
                    Rasterize — smaller size
                  </div>
                </button>
              </div>
            </div>

            {/* Condense: level radio group */}
            {vm.algorithm === "condense" && (
              <div>
                <label
                  className="label"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  Compression Level
                </label>
                <div
                  role="radiogroup"
                  aria-label="Compression level"
                  className="radio-group"
                >
                  {CONDENSE_LEVELS.map(({ value, label, desc, icon }) => (
                    <label
                      key={value}
                      className={`radio-option${
                        vm.condenseLevel === value ? " selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="condense-level"
                        value={value}
                        checked={vm.condenseLevel === value}
                        onChange={() => vm.setCondenseLevel(value)}
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
                        <div
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Photon: DPI selector */}
            {vm.algorithm === "photon" && (
              <div>
                <label
                  className="label"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  Rasterization DPI
                </label>
                <div className="dpi-selector">
                  {([72, 96, 150, 300] as const).map((dpi) => (
                    <button
                      key={dpi}
                      type="button"
                      className={`dpi-chip${
                        vm.photonDpi === dpi ? " active" : ""
                      }`}
                      onClick={() => vm.setPhotonDpi(dpi)}
                    >
                      {dpi} DPI
                    </button>
                  ))}
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={vm.photonGreyscale}
                    onChange={(e) => vm.setPhotonGreyscale(e.target.checked)}
                  />
                  Convert to greyscale (further reduces size)
                </label>
              </div>
            )}

            {/* Estimation panel */}
            {vm.estimation && (
              <div>
                <label
                  className="label"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  Estimated Result
                </label>
                <div className="estimation-panel">
                  <div className="estimation-stat">
                    <span className="estimation-stat-label">Original</span>
                    <span className="estimation-stat-value">
                      {formatBytes(vm.file.size)}
                    </span>
                  </div>
                  <div className="estimation-stat">
                    <span className="estimation-stat-label">Est. Output</span>
                    <span className="estimation-stat-value green">
                      ~{formatBytes(vm.estimation.estimatedBytes)}
                    </span>
                  </div>
                  <div className="estimation-stat">
                    <span className="estimation-stat-label">
                      Est. Reduction
                    </span>
                    <span className="estimation-stat-value green">
                      ~{vm.estimation.reductionPercent}%
                    </span>
                  </div>
                  <div className="estimation-stat">
                    <span className="estimation-stat-label">Quality</span>
                    <span className="estimation-stat-value">
                      <QualityScore score={vm.estimation.qualityScore} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleRun}
                aria-label="Compress PDF"
              >
                🗜️ Compress PDF
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          </div>

          {/* Right: preview */}
          <div className="preview-panel">
            <div className="preview-panel-header">📄 Preview (page 1)</div>
            <div
              className="preview-panel-body"
              style={{ display: "flex", justifyContent: "center" }}
            >
              {vm.isLoading ? (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    padding: 40,
                  }}
                >
                  Loading…
                </div>
              ) : vm.preview ? (
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
                  No preview
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Batch: file list + config ── */}
      {vm.isBatchMode && vm.batchFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Batch config: same algorithm/level controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label
                className="label"
                style={{ marginBottom: 8, display: "block" }}
              >
                Quick Presets
              </label>
              <div className="preset-grid">
                {PRESETS.map(({ value, label, desc, icon }) => (
                  <button
                    key={value}
                    className={`preset-chip${
                      vm.selectedPreset === value ? " active" : ""
                    }`}
                    onClick={() => vm.applyPreset(value)}
                    title={desc}
                    type="button"
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className="label"
                style={{ marginBottom: 8, display: "block" }}
              >
                Algorithm
              </label>
              <div className="algo-tabs">
                <button
                  type="button"
                  className={`algo-tab${
                    vm.algorithm === "condense" ? " active" : ""
                  }`}
                  onClick={() => vm.setAlgorithm("condense")}
                >
                  🔵 Condense
                </button>
                <button
                  type="button"
                  className={`algo-tab${
                    vm.algorithm === "photon" ? " active" : ""
                  }`}
                  onClick={() => vm.setAlgorithm("photon")}
                >
                  ⚡ Photon
                </button>
              </div>
            </div>

            {vm.algorithm === "condense" && (
              <div>
                <label
                  className="label"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  Compression Level
                </label>
                <div
                  role="radiogroup"
                  aria-label="Compression level"
                  className="radio-group"
                >
                  {CONDENSE_LEVELS.map(({ value, label, desc, icon }) => (
                    <label
                      key={value}
                      className={`radio-option${
                        vm.condenseLevel === value ? " selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="batch-condense-level"
                        value={value}
                        checked={vm.condenseLevel === value}
                        onChange={() => vm.setCondenseLevel(value)}
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
                        <div
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {vm.algorithm === "photon" && (
              <div>
                <label
                  className="label"
                  style={{ marginBottom: 8, display: "block" }}
                >
                  Rasterization DPI
                </label>
                <div className="dpi-selector">
                  {([72, 96, 150, 300] as const).map((dpi) => (
                    <button
                      key={dpi}
                      type="button"
                      className={`dpi-chip${
                        vm.photonDpi === dpi ? " active" : ""
                      }`}
                      onClick={() => vm.setPhotonDpi(dpi)}
                    >
                      {dpi} DPI
                    </button>
                  ))}
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={vm.photonGreyscale}
                    onChange={(e) => vm.setPhotonGreyscale(e.target.checked)}
                  />
                  Convert to greyscale
                </label>
              </div>
            )}
          </div>

          {/* Large file warning */}
          {vm.hasLargeFile && (
            <div className="alert alert-warning" style={{ fontSize: 13 }}>
              ⚠ One or more files exceed 50 MB. Processing may be slow.
            </div>
          )}

          {/* File list */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label className="label">
                Files ({vm.batchFiles.length} / {vm.BATCH_MAX_FILES})
              </label>
              {!vm.isBatchProcessing &&
                !vm.batchComplete &&
                vm.batchFiles.length < vm.BATCH_MAX_FILES && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "application/pdf";
                      input.multiple = true;
                      input.onchange = (e) => {
                        const files = Array.from(
                          (e.target as HTMLInputElement).files ?? [],
                        );
                        vm.addBatchFiles(files);
                      };
                      input.click();
                    }}
                  >
                    + Add more
                  </button>
                )}
            </div>
            <div className="batch-file-list">
              {vm.batchFiles.map((bf) => (
                <div key={bf.id} className="batch-file-row">
                  <span style={{ fontSize: 18 }}>
                    {bf.status === "done"
                      ? "✅"
                      : bf.status === "error"
                      ? "❌"
                      : bf.status === "processing"
                      ? "⚡"
                      : "📄"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bf.file.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        display: "flex",
                        gap: 8,
                        marginTop: 2,
                      }}
                    >
                      <span>{formatBytes(bf.originalSize)}</span>
                      {bf.compressedSize !== null && (
                        <>
                          <span>→</span>
                          <span style={{ color: "var(--green)" }}>
                            {formatBytes(bf.compressedSize)}
                          </span>
                          <span style={{ color: "var(--green)" }}>
                            (
                            {formatCompressionStats(
                              bf.originalSize,
                              bf.compressedSize,
                            )}{" "}
                            saved)
                          </span>
                        </>
                      )}
                      {bf.errorMessage && (
                        <span style={{ color: "var(--red, #ef4444)" }}>
                          {bf.errorMessage}
                        </span>
                      )}
                    </div>
                    {(bf.status === "processing" ||
                      bf.status === "done" ||
                      bf.status === "error") && (
                      <div
                        className="batch-file-progress"
                        style={{ marginTop: 4 }}
                      >
                        <div
                          className={`batch-file-progress-fill${
                            bf.status === "error" ? " error" : ""
                          }`}
                          style={{ width: `${bf.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {bf.status === "done" && bf.resultBlobUrl && (
                    <a
                      href={bf.resultBlobUrl}
                      download={bf.file.name.replace(
                        /\.pdf$/i,
                        "_compressed.pdf",
                      )}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, flexShrink: 0 }}
                    >
                      ↓
                    </a>
                  )}
                  {!vm.isBatchProcessing && bf.status === "pending" && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, flexShrink: 0 }}
                      onClick={() => vm.removeBatchFile(bf.id)}
                      aria-label={`Remove ${bf.file.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Batch actions */}
          {!vm.batchComplete && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleBatchRun}
                disabled={vm.isBatchProcessing || vm.batchFiles.length === 0}
                aria-label="Compress all files"
              >
                {vm.isBatchProcessing ? "⚡ Compressing…" : "🗜️ Compress All"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={vm.handleReset}
                disabled={vm.isBatchProcessing}
              >
                Reset
              </button>
            </div>
          )}

          {/* Batch complete: ZIP download */}
          {vm.batchComplete && (
            <div
              className="card fade-in"
              style={{ textAlign: "center", marginTop: 8 }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--green)",
                  marginBottom: 8,
                }}
              >
                Batch Compression Complete
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 16,
                }}
              >
                {vm.batchFiles.filter((f) => f.status === "done").length} of{" "}
                {vm.batchFiles.length} files compressed successfully.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {vm.batchZipUrl && (
                  <a
                    href={vm.batchZipUrl}
                    download="compressed_files.zip"
                    className="btn btn-primary"
                  >
                    ⬇ Download All as ZIP
                  </a>
                )}
                <button className="btn btn-secondary" onClick={vm.handleReset}>
                  ↩ Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Progress panel (single file) ── */}
      {!vm.isBatchMode && (
        <ProgressPanel
          status={vm.status}
          progress={vm.progress}
          label={vm.progressLabel}
          errorMessage={vm.errorMessage ?? undefined}
          onRetry={vm.handleReset}
        />
      )}

      {/* ── Success: before/after + download (single file) ── */}
      {!vm.isBatchMode && vm.status === "success" && (
        <>
          {vm.noReduction && (
            <div className="alert alert-warning" style={{ marginTop: 16 }}>
              ⚠ No size reduction achieved — original file offered for download.
            </div>
          )}

          {/* Before/after comparison panel */}
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
                <div className="stat-item">
                  <div className="stat-label">Quality</div>
                  <div className="stat-value">
                    {vm.estimation && (
                      <QualityScore score={vm.estimation.qualityScore} />
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

      {/* ── Photon warning modal ── */}
      {vm.showPhotonWarning && (
        <PhotonWarningModal
          onAcknowledge={vm.acknowledgePhotonWarning}
          onDismiss={vm.dismissPhotonWarning}
        />
      )}
    </ToolLayout>
  );
}
