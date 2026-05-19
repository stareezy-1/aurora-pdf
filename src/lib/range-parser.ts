/**
 * Parses a comma-separated page range string (e.g. "1-3,5,7-9") into a sorted,
 * deduplicated array of page numbers clamped to [1, pageCount].
 *
 * @param rangeStr - The range string to parse (e.g. "1-3,5,7-9")
 * @param pageCount - The total number of pages (upper bound, inclusive)
 * @returns Sorted, deduplicated array of page numbers within [1, pageCount],
 *          or [] for empty/invalid input
 */
export function parseRange(rangeStr: string, pageCount: number): number[] {
  if (!rangeStr || typeof rangeStr !== "string") return [];

  const trimmed = rangeStr.trim();
  if (trimmed === "") return [];

  const pages = new Set<number>();

  const segments = trimmed.split(",");

  for (const segment of segments) {
    const part = segment.trim();
    if (part === "") continue;

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      // Normalise reversed ranges (e.g. "5-3" → 3,4,5)
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) {
        if (i >= 1 && i <= pageCount) {
          pages.add(i);
        }
      }
      continue;
    }

    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const page = parseInt(singleMatch[1], 10);
      if (page >= 1 && page <= pageCount) {
        pages.add(page);
      }
      continue;
    }

    // Segment is not a valid number or range — treat the whole string as invalid
    // and return [] to signal invalid input
    return [];
  }

  return Array.from(pages).sort((a, b) => a - b);
}
