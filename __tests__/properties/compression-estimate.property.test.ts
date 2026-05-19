// Feature: aurora-2-ux-improvements, Property 4: Compression size estimate is always a valid range below input size

import { describe, it } from "vitest";
import * as fc from "fast-check";
import {
  estimateSize,
  type CompressionLevel,
} from "../../src/lib/compression-estimate";

/**
 * Validates: Requirements 25.1
 *
 * Property 4: Compression size estimate is always a valid range below input size
 *
 * For any positive input size and any compression level:
 *   1. min <= max  (the range is well-formed)
 *   2. max < bytes (the estimate is always smaller than the input)
 *   3. min >= 0    (no negative sizes)
 *   4. bytes === 0 → { min: 0, max: 0 }
 */

const LEVELS: CompressionLevel[] = ["low", "standard", "high"];

const levelArb = fc.constantFrom<CompressionLevel>(...LEVELS);

describe("Property 4: Compression size estimate is always a valid range below input size", () => {
  it("min is always <= max", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        levelArb,
        (bytes, level) => {
          const { min, max } = estimateSize(bytes, level);
          return min <= max;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("max is always strictly less than the input size", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        levelArb,
        (bytes, level) => {
          const { max } = estimateSize(bytes, level);
          return max < bytes;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("min is always >= 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        levelArb,
        (bytes, level) => {
          const { min } = estimateSize(bytes, level);
          return min >= 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns { min: 0, max: 0 } for bytes === 0", () => {
    fc.assert(
      fc.property(levelArb, (level) => {
        const result = estimateSize(0, level);
        return result.min === 0 && result.max === 0;
      }),
      { numRuns: 100 },
    );
  });

  it("higher compression levels produce smaller or equal max estimates", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000_000 }), (bytes) => {
        const low = estimateSize(bytes, "low");
        const standard = estimateSize(bytes, "standard");
        const high = estimateSize(bytes, "high");
        // Each level's max should be <= the previous level's max
        return standard.max <= low.max && high.max <= standard.max;
      }),
      { numRuns: 100 },
    );
  });
});
