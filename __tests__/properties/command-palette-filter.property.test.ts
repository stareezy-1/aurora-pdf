// Feature: aurora-2-ux-improvements, Property 5: CommandPalette filter returns only tools whose names contain the query

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { filterTools } from "../../src/components/CommandPalette/CommandPalette";

/**
 * Validates: Requirements 6.2
 *
 * Property 5: CommandPalette filter returns only tools whose names contain the query
 *
 * For any query string:
 *   1. Every result label contains the query as a case-insensitive substring
 *   2. No tool whose label contains the query is omitted from the results
 *   3. An empty query returns all tools
 */

const TOOLS = [
  {
    path: "/compress",
    label: "Compress PDF",
    category: "Optimize",
    icon: "🗜️",
  },
  { path: "/ocr", label: "OCR to PDF", category: "Convert", icon: "🔍" },
  {
    path: "/searchable-pdf",
    label: "Searchable PDF OCR",
    category: "Convert",
    icon: "🔎",
  },
  { path: "/pdf-to-jpg", label: "PDF to JPG", category: "Convert", icon: "🖼️" },
  {
    path: "/pdf-to-word",
    label: "PDF to Word",
    category: "Convert",
    icon: "📝",
  },
  {
    path: "/word-to-pdf",
    label: "Word to PDF",
    category: "Convert",
    icon: "📄",
  },
  {
    path: "/pdf-to-excel",
    label: "PDF to Excel",
    category: "Convert",
    icon: "📊",
  },
  {
    path: "/excel-to-pdf",
    label: "Excel to PDF",
    category: "Convert",
    icon: "📋",
  },
  { path: "/edit", label: "Edit PDF", category: "Edit", icon: "✏️" },
  { path: "/sign", label: "Sign PDF", category: "Edit", icon: "✍️" },
  { path: "/watermark", label: "Add Watermark", category: "Edit", icon: "💧" },
  { path: "/split", label: "Split PDF", category: "Edit", icon: "✂️" },
  { path: "/organize", label: "Organize PDF", category: "Edit", icon: "📑" },
  {
    path: "/html-to-pdf",
    label: "HTML to PDF",
    category: "Convert",
    icon: "🌐",
  },
  { path: "/protect", label: "Protect PDF", category: "Security", icon: "🔐" },
] as const;

describe("Property 5: CommandPalette filter returns only tools whose names contain the query", () => {
  it("every result label contains the query as a case-insensitive substring", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (query) => {
        const results = filterTools(TOOLS, query);
        const q = query.toLowerCase();
        return results.every((t) => t.label.toLowerCase().includes(q));
      }),
      { numRuns: 100 },
    );
  });

  it("no matching tool is omitted from the results", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (query) => {
        const results = filterTools(TOOLS, query);
        const q = query.toLowerCase();
        const resultPaths = new Set(results.map((t) => t.path));
        // Every tool that matches must appear in results
        return TOOLS.every((t) =>
          t.label.toLowerCase().includes(q) ? resultPaths.has(t.path) : true,
        );
      }),
      { numRuns: 100 },
    );
  });

  it("empty query returns all tools", () => {
    fc.assert(
      fc.property(fc.constant(""), (query) => {
        const results = filterTools(TOOLS, query);
        return results.length === TOOLS.length;
      }),
      { numRuns: 100 },
    );
  });

  it("result is a subset of the input tools", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (query) => {
        const results = filterTools(TOOLS, query);
        const allPaths = new Set<string>(TOOLS.map((t) => t.path));
        return results.every((t) => allPaths.has(t.path));
      }),
      { numRuns: 100 },
    );
  });
});
