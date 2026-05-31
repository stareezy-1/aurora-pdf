// Unit tests for range-parser
// Feature: aurora-pdf-feature-parity
// Requirements: 7.1, 7.4, 7.5

import { describe, it, expect } from "vitest";
import { parseRange, formatRange } from "@/lib/range-parser";
import { InvalidPageRangeError, PageRangeOutOfBoundsError } from "@/lib/errors";

// ── parseRange ────────────────────────────────────────────────────────────────

describe("parseRange", () => {
  describe("valid range strings", () => {
    it("parses a single page number", () => {
      expect(parseRange("5", 10)).toEqual([5]);
    });

    it("parses a simple range", () => {
      expect(parseRange("1-3", 10)).toEqual([1, 2, 3]);
    });

    it("parses a comma-separated list of pages", () => {
      expect(parseRange("1,3,5", 10)).toEqual([1, 3, 5]);
    });

    it("parses a mixed range string (e.g. '1-3,5,7-9')", () => {
      expect(parseRange("1-3,5,7-9", 10)).toEqual([1, 2, 3, 5, 7, 8, 9]);
    });

    it("deduplicates overlapping ranges", () => {
      expect(parseRange("1-3,2-4", 10)).toEqual([1, 2, 3, 4]);
    });

    it("deduplicates repeated single pages", () => {
      expect(parseRange("2,2,2", 10)).toEqual([2]);
    });

    it("returns a sorted result regardless of input order", () => {
      expect(parseRange("9,1,5", 10)).toEqual([1, 5, 9]);
    });

    it("handles reversed range segments (e.g. '5-3')", () => {
      expect(parseRange("5-3", 10)).toEqual([3, 4, 5]);
    });

    it("handles whitespace around segments", () => {
      expect(parseRange(" 1 - 3 , 5 ", 10)).toEqual([1, 2, 3, 5]);
    });

    it("handles a range that covers all pages", () => {
      expect(parseRange("1-5", 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it("handles a single page equal to totalPages", () => {
      expect(parseRange("10", 10)).toEqual([10]);
    });

    it("handles page 1 on a single-page document", () => {
      expect(parseRange("1", 1)).toEqual([1]);
    });
  });

  // ── Bounds validation (Req 7.4) ─────────────────────────────────────────────

  describe("out-of-bounds pages (Req 7.4)", () => {
    it("throws PageRangeOutOfBoundsError for a single page exceeding totalPages", () => {
      expect(() => parseRange("11", 10)).toThrow(PageRangeOutOfBoundsError);
    });

    it("throws PageRangeOutOfBoundsError for a range end exceeding totalPages", () => {
      expect(() => parseRange("8-12", 10)).toThrow(PageRangeOutOfBoundsError);
    });

    it("throws PageRangeOutOfBoundsError for a range start exceeding totalPages", () => {
      expect(() => parseRange("15-20", 10)).toThrow(PageRangeOutOfBoundsError);
    });

    it("throws PageRangeOutOfBoundsError when one segment in a list is out of bounds", () => {
      expect(() => parseRange("1-3,11", 10)).toThrow(PageRangeOutOfBoundsError);
    });

    it("error message includes the offending page number and total", () => {
      let caught: unknown;
      try {
        parseRange("15", 10);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(PageRangeOutOfBoundsError);
      const err = caught as PageRangeOutOfBoundsError;
      expect(err.message).toContain("15");
      expect(err.message).toContain("10");
    });
  });

  // ── Malformed input ──────────────────────────────────────────────────────────

  describe("malformed range strings", () => {
    it("throws InvalidPageRangeError for alphabetic input", () => {
      expect(() => parseRange("abc", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for a range with non-numeric parts", () => {
      expect(() => parseRange("1-a", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for a trailing comma", () => {
      expect(() => parseRange("1,2,", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for a leading comma", () => {
      expect(() => parseRange(",1,2", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for double dash", () => {
      expect(() => parseRange("1--3", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for empty string", () => {
      expect(() => parseRange("", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for whitespace-only string", () => {
      expect(() => parseRange("   ", 10)).toThrow(InvalidPageRangeError);
    });

    it("throws InvalidPageRangeError for special characters", () => {
      expect(() => parseRange("1;3", 10)).toThrow(InvalidPageRangeError);
    });
  });
});

// ── formatRange ───────────────────────────────────────────────────────────────

describe("formatRange", () => {
  it("returns empty string for an empty array", () => {
    expect(formatRange([])).toBe("");
  });

  it("formats a single page", () => {
    expect(formatRange([5])).toBe("5");
  });

  it("collapses consecutive pages into a range", () => {
    expect(formatRange([1, 2, 3])).toBe("1-3");
  });

  it("formats non-consecutive pages as comma-separated singles", () => {
    expect(formatRange([1, 3, 5])).toBe("1,3,5");
  });

  it("formats a mixed array correctly (e.g. [1,2,3,5,7,8,9] → '1-3,5,7-9')", () => {
    expect(formatRange([1, 2, 3, 5, 7, 8, 9])).toBe("1-3,5,7-9");
  });

  it("handles a single two-page run", () => {
    expect(formatRange([4, 5])).toBe("4-5");
  });

  it("deduplicates repeated pages defensively", () => {
    expect(formatRange([1, 1, 2, 3])).toBe("1-3");
  });

  it("sorts unsorted input defensively", () => {
    expect(formatRange([9, 1, 5])).toBe("1,5,9");
  });

  it("formats a full-document range", () => {
    expect(formatRange([1, 2, 3, 4, 5])).toBe("1-5");
  });
});

// ── Round-trip invariant (Req 7.5) ────────────────────────────────────────────

describe("round-trip: parseRange → formatRange → parseRange (Req 7.5)", () => {
  const TOTAL = 20;

  function roundTrip(rangeStr: string): number[] {
    const first = parseRange(rangeStr, TOTAL);
    const formatted = formatRange(first);
    return parseRange(formatted, TOTAL);
  }

  it("round-trips '1-3,5,7-9'", () => {
    const original = parseRange("1-3,5,7-9", TOTAL);
    expect(roundTrip("1-3,5,7-9")).toEqual(original);
  });

  it("round-trips a single page", () => {
    expect(roundTrip("7")).toEqual([7]);
  });

  it("round-trips a full range", () => {
    const original = parseRange("1-20", TOTAL);
    expect(roundTrip("1-20")).toEqual(original);
  });

  it("round-trips a non-consecutive list", () => {
    const original = parseRange("2,4,6,8,10", TOTAL);
    expect(roundTrip("2,4,6,8,10")).toEqual(original);
  });

  it("round-trips a reversed range segment (normalised on first parse)", () => {
    // "5-3" → [3,4,5] → "3-5" → [3,4,5]
    const first = parseRange("5-3", TOTAL);
    const formatted = formatRange(first);
    const second = parseRange(formatted, TOTAL);
    expect(second).toEqual(first);
  });

  it("round-trips a range with duplicates (normalised on first parse)", () => {
    // "1-3,2-4" → [1,2,3,4] → "1-4" → [1,2,3,4]
    const first = parseRange("1-3,2-4", TOTAL);
    const formatted = formatRange(first);
    const second = parseRange(formatted, TOTAL);
    expect(second).toEqual(first);
  });
});
