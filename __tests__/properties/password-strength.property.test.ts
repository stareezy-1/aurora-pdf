// Feature: aurora-2-ux-improvements, Property 2: Password strength is monotonically non-decreasing

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { scorePassword } from "../../src/lib/password-strength";

/**
 * Validates: Requirements 28.4
 *
 * Property 2: Password strength is monotonically non-decreasing
 *
 * Adding qualifying characters to a password must never decrease its score.
 * Specifically:
 *   - Appending a digit to a password that had no digit must not lower the score
 *   - Appending an uppercase letter to an all-lowercase password must not lower the score
 *   - Appending a special character must not lower the score
 *   - Extending a password beyond the length threshold must not lower the score
 */

/** Characters that qualify as "special" per the scoring rules */
const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;':\",./<>?";

describe("Property 2: Password strength is monotonically non-decreasing", () => {
  it("appending a digit never decreases the score", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 9 }),
        (base, digit) => {
          const extended = base + String(digit);
          return scorePassword(extended) >= scorePassword(base);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("appending an uppercase letter never decreases the score", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        fc.integer({ min: 65, max: 90 }).map((c) => String.fromCharCode(c)), // A-Z
        (base, upper) => {
          const extended = base + upper;
          return scorePassword(extended) >= scorePassword(base);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("appending a special character never decreases the score", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        fc
          .integer({ min: 0, max: SPECIAL_CHARS.length - 1 })
          .map((i) => SPECIAL_CHARS[i]),
        (base, special) => {
          const extended = base + special;
          return scorePassword(extended) >= scorePassword(base);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("extending a password past the length-8 threshold never decreases the score", () => {
    fc.assert(
      fc.property(
        // Start with a password shorter than 8 chars
        fc.string({ minLength: 0, maxLength: 7 }),
        // Pad it to at least 8 chars with lowercase letters (no new qualifying chars)
        fc.integer({ min: 1, max: 10 }),
        (base, extra) => {
          const padding = "a".repeat(extra);
          const extended = base + padding;
          // Only meaningful when we cross the threshold
          if (extended.length < 8) return true;
          return scorePassword(extended) >= scorePassword(base);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("score is always in the range [0, 3]", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (pwd) => {
        const score = scorePassword(pwd);
        return score >= 0 && score <= 3;
      }),
      { numRuns: 100 },
    );
  });
});
