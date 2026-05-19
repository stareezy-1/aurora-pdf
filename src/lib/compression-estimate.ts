/**
 * Compression level type for PDF compression operations.
 */
export type CompressionLevel = "low" | "standard" | "high";

/**
 * Typical size reduction ratios per compression level.
 * Each entry is [minRatio, maxRatio] where the ratio represents the fraction
 * of the original size that remains after compression.
 *
 * For example, low = [0.70, 0.85] means the output will be 70–85% of the input size.
 */
const REDUCTION_RATIOS: Record<CompressionLevel, [number, number]> = {
  low: [0.7, 0.85],
  standard: [0.5, 0.7],
  high: [0.3, 0.5],
};

/**
 * Estimates the output size range after compression.
 *
 * @param bytes - The input file size in bytes
 * @param level - The compression level to apply
 * @returns An object with `min` and `max` estimated output sizes in bytes.
 *          Returns `{ min: 0, max: 0 }` when `bytes === 0`.
 */
export function estimateSize(
  bytes: number,
  level: CompressionLevel,
): { min: number; max: number } {
  if (bytes === 0) return { min: 0, max: 0 };

  const [minRatio, maxRatio] = REDUCTION_RATIOS[level];

  // Ensure max is always strictly less than the input (rounding can otherwise
  // produce max === bytes for very small inputs, e.g. 1 byte at low ratio 0.85).
  const max = Math.min(Math.round(bytes * maxRatio), bytes - 1);
  const min = Math.min(Math.round(bytes * minRatio), max);

  return { min, max };
}
