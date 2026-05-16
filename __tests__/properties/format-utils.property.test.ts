import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  formatFileInfo,
  formatCompressionStats,
  formatCombinedSize,
  formatPageTitle,
  formatBreadcrumb,
  TOOL_DESCRIPTIONS,
} from "../../src/lib/format-utils";

describe("Property 8: formatFileInfo produces correct KB/MB output", () => {
  it("uses KB for files under 1 MB", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1024 * 1024 - 1 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (bytes, name) => {
          const result = formatFileInfo(name, bytes);
          return result.includes("KB") && !result.includes("MB");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("uses MB for files >= 1 MB", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1024 * 1024, max: 100 * 1024 * 1024 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (bytes, name) => {
          const result = formatFileInfo(name, bytes);
          return result.includes("MB");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("always includes the filename", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => !s.includes("—")),
        (bytes, name) => {
          const result = formatFileInfo(name, bytes);
          return result.startsWith(name);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 9: formatCombinedSize sums bytes correctly", () => {
  it("total bytes equals sum of individual file sizes", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 * 1024 * 1024 }), {
          minLength: 1,
          maxLength: 10,
        }),
        (sizes) => {
          const files = sizes.map(
            (s, i) =>
              new File([new Uint8Array(s)], `file${i}.pdf`, {
                type: "application/pdf",
              }),
          );
          const { totalBytes, count } = formatCombinedSize(files);
          const expectedTotal = sizes.reduce((a, b) => a + b, 0);
          return totalBytes === expectedTotal && count === sizes.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 11: formatCompressionStats formatted to two decimal places", () => {
  it("always returns a string ending in %", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
        fc.integer({ min: 0, max: 100 * 1024 * 1024 }),
        (original, compressed) => {
          const result = formatCompressionStats(original, compressed);
          return result.endsWith("%") && /^-?\d+\.\d{2}%$/.test(result);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 27: TOOL_DESCRIPTIONS word count <= 15", () => {
  it("every tool description has at most 15 words", () => {
    for (const [tool, desc] of Object.entries(TOOL_DESCRIPTIONS)) {
      const wordCount = desc.trim().split(/\s+/).length;
      expect(
        wordCount,
        `"${tool}" description has ${wordCount} words`,
      ).toBeLessThanOrEqual(15);
    }
  });
});

describe("Property 28: navigation text generation follows required pattern", () => {
  it('formatPageTitle returns "{toolName} — AuroraPDF"', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (toolName) => {
        const title = formatPageTitle(toolName);
        return title === `${toolName} — AuroraPDF`;
      }),
      { numRuns: 100 },
    );
  });

  it('formatBreadcrumb returns { home: "Home", tool: toolName }', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 40 }), (toolName) => {
        const crumb = formatBreadcrumb(toolName);
        return crumb.home === "Home" && crumb.tool === toolName;
      }),
      { numRuns: 100 },
    );
  });
});
