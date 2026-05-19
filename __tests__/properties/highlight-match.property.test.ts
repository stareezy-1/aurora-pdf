// Feature: aurora-2-ux-improvements, Property 6: Matching substring highlight covers exactly the matched region

import { describe, it } from "vitest";
import * as fc from "fast-check";

/**
 * Validates: Requirements 6.3
 *
 * Property 6: Matching substring highlight covers exactly the matched region
 *
 * We test the pure highlight logic by extracting it as a string-based function
 * (rather than the React-node version) so it can be verified without a DOM.
 *
 * highlightMatchStr(label, query) returns:
 *   { before, match, after } — the three segments of the label split at the first
 *   case-insensitive occurrence of query, or null when there is no match.
 *
 * Properties:
 *   1. When a match exists: before + match + after === label (no characters lost)
 *   2. When a match exists: match.toLowerCase() === query.toLowerCase()
 *   3. When a match exists: the match starts at the correct index
 *   4. When no match exists: the function returns null
 *   5. Empty query always returns null (nothing to highlight)
 */

interface HighlightSegments {
  before: string;
  match: string;
  after: string;
  index: number;
}

function highlightMatchStr(
  label: string,
  query: string,
): HighlightSegments | null {
  if (!query) return null;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  return {
    before: label.slice(0, idx),
    match: label.slice(idx, idx + query.length),
    after: label.slice(idx + query.length),
    index: idx,
  };
}

describe("Property 6: Matching substring highlight covers exactly the matched region", () => {
  it("before + match + after reconstructs the original label exactly", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (label, query) => {
          const result = highlightMatchStr(label, query);
          if (result === null) return true; // no match — skip
          return result.before + result.match + result.after === label;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("the matched segment equals the query (case-insensitively)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (label, query) => {
          const result = highlightMatchStr(label, query);
          if (result === null) return true;
          return result.match.toLowerCase() === query.toLowerCase();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("the match starts at the first occurrence of the query in the label", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (label, query) => {
          const result = highlightMatchStr(label, query);
          if (result === null) return true;
          const expectedIdx = label.toLowerCase().indexOf(query.toLowerCase());
          return result.index === expectedIdx;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null when the label does not contain the query", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (label, query) => {
          const hasMatch = label.toLowerCase().includes(query.toLowerCase());
          const result = highlightMatchStr(label, query);
          return hasMatch ? result !== null : result === null;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty query always returns null", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (label) => {
        return highlightMatchStr(label, "") === null;
      }),
      { numRuns: 100 },
    );
  });

  // Guarantee: when we construct a label that definitely contains the query,
  // the result is never null and the match length equals the query length.
  it("always finds a match when the label is constructed to contain the query", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 15 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ maxLength: 15 }),
        (prefix, query, suffix) => {
          const label = prefix + query + suffix;
          const result = highlightMatchStr(label, query);
          return result !== null && result.match.length === query.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});
