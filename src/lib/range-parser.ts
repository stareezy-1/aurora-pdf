import { InvalidPageRangeError, PageRangeOutOfBoundsError } from "@/lib/errors";

/**
 * Parse a Page_Range string (e.g., "1-3,5,7-9") into a sorted, deduplicated
 * array of 1-based page numbers.
 *
 * @param rangeStr - The range string to parse (1-based page numbers)
 * @param totalPages - Total number of pages (for bounds checking)
 * @returns Sorted, deduplicated array of 1-based page numbers
 * @throws {InvalidPageRangeError} if the string is malformed
 * @throws {PageRangeOutOfBoundsError} if any page number exceeds totalPages or is < 1
 */
export function parseRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || typeof rangeStr !== "string") {
    throw new InvalidPageRangeError(rangeStr ?? "");
  }

  const trimmed = rangeStr.trim();
  if (trimmed === "") {
    throw new InvalidPageRangeError(rangeStr);
  }

  const pages = new Set<number>();
  const segments = trimmed.split(",");

  for (const segment of segments) {
    const part = segment.trim();

    // Reject empty segments (e.g. trailing comma "1,2,")
    if (part === "") {
      throw new InvalidPageRangeError(rangeStr);
    }

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);

      // Validate both ends are >= 1
      if (start < 1) throw new InvalidPageRangeError(rangeStr);
      if (end < 1) throw new InvalidPageRangeError(rangeStr);

      // Validate bounds
      if (start > totalPages)
        throw new PageRangeOutOfBoundsError(start, totalPages);
      if (end > totalPages)
        throw new PageRangeOutOfBoundsError(end, totalPages);

      // Support reversed ranges (e.g. "5-3" → 3,4,5)
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) {
        pages.add(i);
      }
      continue;
    }

    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const page = parseInt(singleMatch[1], 10);

      if (page < 1) throw new InvalidPageRangeError(rangeStr);
      if (page > totalPages)
        throw new PageRangeOutOfBoundsError(page, totalPages);

      pages.add(page);
      continue;
    }

    // Segment is not a valid number or range — malformed
    throw new InvalidPageRangeError(rangeStr);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Format a sorted array of 1-based page numbers back to a canonical range string.
 *
 * Consecutive runs are collapsed into ranges:
 *   [1, 2, 3, 5, 7, 8, 9] → "1-3,5,7-9"
 *   [1, 3, 5]              → "1,3,5"
 *   []                     → ""
 *
 * @param pages - Sorted array of 1-based page numbers (duplicates are ignored)
 * @returns Canonical range string
 */
export function formatRange(pages: number[]): string {
  if (pages.length === 0) return "";

  // Deduplicate and sort defensively
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);

  const parts: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      // Extend the current run
      rangeEnd = sorted[i];
    } else {
      // Flush the current run
      parts.push(
        rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`,
      );
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }

  // Flush the final run
  parts.push(
    rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`,
  );

  return parts.join(",");
}
