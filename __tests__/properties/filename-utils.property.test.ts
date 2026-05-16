import { describe, it } from "vitest";
import * as fc from "fast-check";
import {
  buildOutputFilename,
  buildPdfToJpgZipFilename,
  buildPageJpgFilename,
} from "../../src/lib/filename-utils";
import type { ToolName } from "../../src/lib/filename-utils";

const TOOL_NAMES: ToolName[] = [
  "compress",
  "pdf-to-word",
  "word-to-pdf",
  "pdf-to-excel",
  "excel-to-pdf",
  "edit",
  "sign",
  "watermark",
  "split",
  "split-zip",
  "html-to-pdf",
  "organize",
  "protect",
];

const EXPECTED_SUFFIXES: Record<ToolName, string> = {
  compress: "_compressed.pdf",
  ocr: "ocr-output.pdf",
  "pdf-to-jpg": "_page1.jpg",
  "pdf-to-word": ".docx",
  "word-to-pdf": ".pdf",
  "pdf-to-excel": ".xlsx",
  "excel-to-pdf": ".pdf",
  edit: "_edited.pdf",
  sign: "_signed.pdf",
  watermark: "_watermarked.pdf",
  split: "_split.pdf",
  "split-zip": "_split_parts.zip",
  "html-to-pdf": "_converted.pdf",
  organize: "_organized.pdf",
  protect: "_protected.pdf",
};

describe("Property 12: output filename generation follows the tool pattern", () => {
  it("output filename ends with the correct suffix for each tool", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOOL_NAMES),
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        (tool, base) => {
          const originalName = `${base}.pdf`;
          const result = buildOutputFilename(originalName, tool);
          const expectedSuffix = EXPECTED_SUFFIXES[tool];
          return result.endsWith(expectedSuffix);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('OCR always returns "ocr-output.pdf" regardless of input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (name) => buildOutputFilename(name, "ocr") === "ocr-output.pdf",
      ),
      { numRuns: 100 },
    );
  });

  it("strips path separators from the base name", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOOL_NAMES),
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-zA-Z0-9]+$/.test(s)),
        (tool, base) => {
          const withPath = `some/path/${base}.pdf`;
          const result = buildOutputFilename(withPath, tool);
          return !result.includes("/") && !result.includes("\\");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("buildPdfToJpgZipFilename ends with _pages.zip", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        (base) => {
          const result = buildPdfToJpgZipFilename(`${base}.pdf`);
          return result.endsWith("_pages.zip");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("buildPageJpgFilename ends with _page{n}.jpg", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 30 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        fc.integer({ min: 1, max: 9999 }),
        (base, pageNum) => {
          const result = buildPageJpgFilename(`${base}.pdf`, pageNum);
          return result.endsWith(`_page${pageNum}.jpg`);
        },
      ),
      { numRuns: 100 },
    );
  });
});
