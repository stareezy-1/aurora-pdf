// Feature: aurora-2-ux-improvements, Property 3: Page range parser produces valid, deduplicated, bounded output

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { parseRange } from "../../src/lib/range-parser";

/**
 * Validates: Requirements 28.1, 28.2, 28.3
 *
 * Property 3: Page range parser produces valid, deduplicated, bounded output
 *
 * For any valid range string and page count:
 *   1. Every page number in the result is within [1, pageCount]
 *   2. The result contains no duplicates
 *   3. The result is sorted in ascending order
 */

/** Generates a single page range segment like "3" or "2-7" */
const rangeSegmentArb = (pageCount: number) =>
  fc.oneof(
    // Single page
    fc.integer({ min: 1, max: pageCount }).map(String),
    // Range "lo-hi"
    fc
      .tuple(
        fc.integer({ min: 1, max: pageCount }),
        fc.integer({ min: 1, max: pageCount }),
      )
      .map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`),
  );

/** Generates a comma-separated range string from 1–5 segments */
const rangeStrArb = (pageCount: number) =>
  fc
    .array(rangeSegmentArb(pageCount), { minLength: 1, maxLength: 5 })
    .map((segs) => segs.join(","));

describe("Property 3: Page range parser produces valid, deduplicated, bounded output", () => {
  it("all returned page numbers are within [1, pageCount]", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 100 })
          .chain((pageCount) =>
            fc.tuple(fc.constant(pageCount), rangeStrArb(pageCount)),
          ),
        ([pageCount, rangeStr]) => {
          const result = parseRange(rangeStr, pageCount);
          return result.every((p) => p >= 1 && p <= pageCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("result contains no duplicate page numbers", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 100 })
          .chain((pageCount) =>
            fc.tuple(fc.constant(pageCount), rangeStrArb(pageCount)),
          ),
        ([pageCount, rangeStr]) => {
          const result = parseRange(rangeStr, pageCount);
          return result.length === new Set(result).size;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("result is sorted in ascending order", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 100 })
          .chain((pageCount) =>
            fc.tuple(fc.constant(pageCount), rangeStrArb(pageCount)),
          ),
        ([pageCount, rangeStr]) => {
          const result = parseRange(rangeStr, pageCount);
          for (let i = 1; i < result.length; i++) {
            if (result[i] <= result[i - 1]) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("throws InvalidPageRangeError for empty string", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (pageCount) => {
        let threw = false;
        try {
          parseRange("", pageCount);
        } catch {
          threw = true;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  it("throws for out-of-bounds page numbers (above totalPages)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }).chain((pageCount) =>
          fc.tuple(
            fc.constant(pageCount),
            // Generate page numbers strictly above pageCount (always out-of-bounds)
            fc
              .array(fc.integer({ min: pageCount + 1, max: pageCount + 100 }), {
                minLength: 1,
                maxLength: 5,
              })
              .map((nums) => nums.join(",")),
          ),
        ),
        ([pageCount, rangeStr]) => {
          let threw = false;
          try {
            parseRange(rangeStr, pageCount);
          } catch {
            threw = true;
          }
          return threw;
        },
      ),
      { numRuns: 100 },
    );
  });
});
