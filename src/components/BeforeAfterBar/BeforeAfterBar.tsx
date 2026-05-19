interface BeforeAfterBarProps {
  originalBytes: number;
  compressedBytes: number;
}

/**
 * Formats bytes to a human-readable string.
 * Shows KB if < 1 MB, MB otherwise (1 decimal place).
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * BeforeAfterBar — horizontal bar split proportionally showing original vs compressed size.
 *
 * Left segment (gray): original size
 * Right segment (green at 30% opacity): compressed size
 * Size labels appear above each segment.
 *
 * Requirements: 25.2
 */
export function BeforeAfterBar({
  originalBytes,
  compressedBytes,
}: BeforeAfterBarProps) {
  // Guard against division by zero
  const ratio =
    originalBytes > 0 ? Math.min(compressedBytes / originalBytes, 1) * 100 : 0;

  const originalLabel = formatBytes(originalBytes);
  const compressedLabel = formatBytes(compressedBytes);

  return (
    <div
      style={{ marginTop: 12 }}
      aria-label="Before and after size comparison"
    >
      {/* Labels above the bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
        aria-hidden="true"
      >
        <span
          style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}
        >
          Original: {originalLabel}
        </span>
        <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
          Compressed: {compressedLabel}
        </span>
      </div>

      {/* Bar */}
      <div
        style={{
          display: "flex",
          height: 12,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          background: "var(--surface-3)",
        }}
      >
        {/* Compressed segment (green) */}
        <div
          style={{
            width: `${ratio}%`,
            background: "rgba(0,255,136,0.3)",
            transition: "width 400ms var(--ease-inout)",
            flexShrink: 0,
          }}
        />
        {/* Remaining (original minus compressed) stays as the gray background */}
      </div>

      {/* Screen-reader accessible summary */}
      <p
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        Original size: {originalLabel}. Compressed size: {compressedLabel}.
      </p>
    </div>
  );
}
