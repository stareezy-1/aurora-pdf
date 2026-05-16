import { DownloadButton } from "@/components/DownloadButton/DownloadButton";
import type { PrivacyShieldProps } from "./PrivacyShield.types";

const STATUS_CONFIG = {
  idle: { icon: "🛡", text: "Local Mode", cls: "badge-green" },
  processing: { icon: "⚡", text: "Processing…", cls: "badge-amber" },
  success: { icon: "✓", text: "Local Mode", cls: "badge-green" },
  error: { icon: "⚠", text: "Error", cls: "badge-red" },
};

export function PrivacyShield({
  variant,
  status,
  outputFilename,
  outputSizeBytes,
  blobUrl,
  onDownload,
  onReset,
}: PrivacyShieldProps) {
  const sc = STATUS_CONFIG[status];

  if (variant === "indicator") {
    return (
      <span
        className={`badge ${sc.cls}`}
        aria-label={`Privacy status: ${sc.text}`}
      >
        {sc.icon} {sc.text}
      </span>
    );
  }

  const sizeLabel = outputSizeBytes
    ? outputSizeBytes < 1024 * 1024
      ? `${(outputSizeBytes / 1024).toFixed(1)} KB`
      : `${(outputSizeBytes / 1024 / 1024).toFixed(2)} MB`
    : null;

  return (
    <div
      className="card fade-in"
      style={{ textAlign: "center", marginTop: 20 }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--green)",
          marginBottom: 4,
        }}
      >
        Processed Locally — Zero Upload
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Your file never left your device. All processing happened in your
        browser.
      </p>

      {outputFilename && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "var(--surface-2)",
            borderRadius: "var(--radius-md)",
            marginBottom: 20,
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 22 }}>📄</span>
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
            >
              {outputFilename}
            </div>
            {sizeLabel && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {sizeLabel}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {blobUrl && outputFilename && (
          <DownloadButton
            blobUrl={blobUrl}
            filename={outputFilename}
            onDownloadComplete={onDownload ?? (() => {})}
          />
        )}
        {onReset && (
          <button
            className="btn btn-secondary"
            onClick={onReset}
            aria-label="Process another file"
          >
            ↩ Process Another File
          </button>
        )}
      </div>
    </div>
  );
}
