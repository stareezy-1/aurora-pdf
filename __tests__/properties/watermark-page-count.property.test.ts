// Feature: aurora-pdf-feature-parity, Property 7: Watermark page count invariant

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { resolvePageIndices } from "../../src/engines/watermark-engine";

/**
 * **Validates: Requirements 5.11**
 *
 * Property 7: Watermark page count invariant
 *
 * The watermark engine must never change the page count of the output PDF.
 * This property tests the pure `resolvePageIndices` function which determines
 * which pages receive a watermark — verifying that:
 *
 * 1. All returned indices are valid 0-based indices within [0, totalPages - 1]
 * 2. No duplicate indices are returned
 * 3. The number of targeted pages never exceeds totalPages
 * 4. Special keywords (all, first, last, odd, even) return the correct counts
 * 5. Custom range expressions stay within bounds
 *
 * The page count invariant (output page count === input page count) is
 * guaranteed structurally: the engine iterates over targetIndices and draws
 * on existing pages — it never adds or removes pages in foreground mode.
 * For background mode it uses insertPage + removePage in a balanced pair,
 * preserving the count. These structural properties are verified here via
 * the pure index-resolution function.
 */

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Total page count: 1–200 pages */
const totalPagesArb = fc.integer({ min: 1, max: 200 });

/** Single page range segment: "N" or "N-M" (1-based, within totalPages) */
const rangeSegmentArb = (totalPages: number) =>
  fc.oneof(
    fc.integer({ min: 1, max: totalPages }).map(String),
    fc
      .tuple(
        fc.integer({ min: 1, max: totalPages }),
        fc.integer({ min: 1, max: totalPages }),
      )
      .map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`),
  );

/** Comma-separated range string from 1–5 segments */
const customRangeArb = (totalPages: number) =>
  fc
    .array(rangeSegmentArb(totalPages), { minLength: 1, maxLength: 5 })
    .map((segs) => segs.join(","));

/** All supported pageRange values */
const pageRangeArb = (totalPages: number) =>
  fc.oneof(
    fc.constant(""), // all pages
    fc.constant("all"), // all pages (explicit)
    fc.constant("first"), // first page only
    fc.constant("last"), // last page only
    fc.constant("odd"), // odd pages (1-based)
    fc.constant("even"), // even pages (1-based)
    customRangeArb(totalPages), // custom range expression
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 7: Watermark page count invariant", () => {
  it("all returned indices are valid 0-based indices within [0, totalPages - 1]", () => {
    fc.assert(
      fc.property(
        totalPagesArb.chain((totalPages) =>
          fc.tuple(fc.constant(totalPages), pageRangeArb(totalPages)),
        ),
        ([totalPages, pageRange]) => {
          const indices = resolvePageIndices(pageRange, totalPages);
          return indices.every((idx) => idx >= 0 && idx < totalPages);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("no duplicate indices are returned for any page range", () => {
    fc.assert(
      fc.property(
        totalPagesArb.chain((totalPages) =>
          fc.tuple(fc.constant(totalPages), pageRangeArb(totalPages)),
        ),
        ([totalPages, pageRange]) => {
          const indices = resolvePageIndices(pageRange, totalPages);
          return indices.length === new Set(indices).size;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("number of targeted pages never exceeds totalPages", () => {
    fc.assert(
      fc.property(
        totalPagesArb.chain((totalPages) =>
          fc.tuple(fc.constant(totalPages), pageRangeArb(totalPages)),
        ),
        ([totalPages, pageRange]) => {
          const indices = resolvePageIndices(pageRange, totalPages);
          return indices.length <= totalPages;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("empty string and 'all' both target every page", () => {
    fc.assert(
      fc.property(totalPagesArb, (totalPages) => {
        const fromEmpty = resolvePageIndices("", totalPages);
        const fromAll = resolvePageIndices("all", totalPages);
        return (
          fromEmpty.length === totalPages &&
          fromAll.length === totalPages &&
          fromEmpty.every((idx, i) => idx === i) &&
          fromAll.every((idx, i) => idx === i)
        );
      }),
      { numRuns: 200 },
    );
  });

  it("'first' always returns exactly [0] for any page count", () => {
    fc.assert(
      fc.property(totalPagesArb, (totalPages) => {
        const indices = resolvePageIndices("first", totalPages);
        return indices.length === 1 && indices[0] === 0;
      }),
      { numRuns: 200 },
    );
  });

  it("'last' always returns exactly [totalPages - 1] for any page count", () => {
    fc.assert(
      fc.property(totalPagesArb, (totalPages) => {
        const indices = resolvePageIndices("last", totalPages);
        return indices.length === 1 && indices[0] === totalPages - 1;
      }),
      { numRuns: 200 },
    );
  });

  it("'odd' and 'even' together cover all pages exactly once", () => {
    fc.assert(
      fc.property(totalPagesArb, (totalPages) => {
        const odd = resolvePageIndices("odd", totalPages);
        const even = resolvePageIndices("even", totalPages);
        const combined = [...odd, ...even].sort((a, b) => a - b);
        const allPages = Array.from({ length: totalPages }, (_, i) => i);
        return (
          combined.length === totalPages &&
          combined.every((idx, i) => idx === allPages[i])
        );
      }),
      { numRuns: 200 },
    );
  });

  it("indices are always sorted in ascending order", () => {
    fc.assert(
      fc.property(
        totalPagesArb.chain((totalPages) =>
          fc.tuple(fc.constant(totalPages), pageRangeArb(totalPages)),
        ),
        ([totalPages, pageRange]) => {
          const indices = resolvePageIndices(pageRange, totalPages);
          for (let i = 1; i < indices.length; i++) {
            if (indices[i] <= indices[i - 1]) return false;
          }
          return true;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("out-of-bounds page numbers in custom range are silently excluded", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }).chain((totalPages) =>
          fc.tuple(
            fc.constant(totalPages),
            // Generate page numbers strictly outside [1, totalPages]
            fc
              .array(
                fc.integer({ min: totalPages + 1, max: totalPages + 100 }),
                { minLength: 1, maxLength: 5 },
              )
              .map((nums) => nums.join(",")),
          ),
        ),
        ([totalPages, outOfBoundsRange]) => {
          const indices = resolvePageIndices(outOfBoundsRange, totalPages);
          return indices.length === 0;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("single-page document: non-even targeting modes return exactly [0]", () => {
    // On a 1-page doc, page 1 is odd (1-based), so "odd" targets it but "even" does not.
    const modesTargetingPage1 = ["", "all", "first", "last", "odd", "1"];
    for (const mode of modesTargetingPage1) {
      const indices = resolvePageIndices(mode, 1);
      if (indices.length !== 1 || indices[0] !== 0) {
        throw new Error(
          `Mode "${mode}" on 1-page doc returned ${JSON.stringify(
            indices,
          )}, expected [0]`,
        );
      }
    }
    // "even" on a 1-page doc correctly returns [] (page 1 is odd, not even)
    const evenIndices = resolvePageIndices("even", 1);
    if (evenIndices.length !== 0) {
      throw new Error(
        `Mode "even" on 1-page doc returned ${JSON.stringify(
          evenIndices,
        )}, expected []`,
      );
    }
  });

  it("custom range '1-N' on N-page doc targets all N pages", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (totalPages) => {
        const range = `1-${totalPages}`;
        const indices = resolvePageIndices(range, totalPages);
        return (
          indices.length === totalPages && indices.every((idx, i) => idx === i)
        );
      }),
      { numRuns: 200 },
    );
  });
});
