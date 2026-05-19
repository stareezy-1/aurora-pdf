import { useState } from "react";
import { Link } from "react-router";
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
  relatedTools,
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

  const showRelated =
    status === "success" && relatedTools && relatedTools.length > 0;

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

      {/* "Try another tool" section */}
      {showRelated && (
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Try another tool
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {relatedTools!.slice(0, 3).map((tool) => (
              <RelatedToolCard key={tool.path} tool={tool} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RelatedToolCardProps {
  tool: { path: string; label: string; icon: string };
}

function RelatedToolCard({ tool }: RelatedToolCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={tool.path}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        textDecoration: "none",
        color: "var(--text)",
        fontSize: 13,
        fontWeight: 500,
        minWidth: 100,
        transition:
          "transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "var(--shadow-md)" : "none",
        borderColor: hovered ? "var(--border-2)" : "var(--border)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: 22 }}>{tool.icon}</span>
      <span style={{ textAlign: "center", lineHeight: 1.3 }}>{tool.label}</span>
    </Link>
  );
}
