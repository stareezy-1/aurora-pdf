import {
  estimateSize,
  type CompressionLevel,
} from "@/lib/compression-estimate";

interface CompressionSizeEstimateProps {
  inputBytes: number;
  level: CompressionLevel;
}

/**
 * CompressionSizeEstimate — displays the estimated output size range for a given
 * compression level.
 *
 * Format: "Estimated output: ~{min}–{max} MB"
 *
 * Requirements: 25.1
 */
export function CompressionSizeEstimate({
  inputBytes,
  level,
}: CompressionSizeEstimateProps) {
  const { min, max } = estimateSize(inputBytes, level);

  const toMb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

  return (
    <p
      style={{
        color: "var(--text-2)",
        fontSize: 13,
        lineHeight: 1.4,
        marginTop: 6,
      }}
    >
      Estimated output: ~{toMb(min)}–{toMb(max)} MB
    </p>
  );
}
