// Feature: aurora-2-ux-improvements, Property 5: CommandPalette filter returns only matching tools

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { filterTools } from "../../src/components/CommandPalette/CommandPalette";
import { TOOL_REGISTRY } from "../../src/lib/tool-registry";

/**
 * Validates: Requirements 6.2
 *
 * Property 5: CommandPalette filter returns only tools that match the query
 *
 * filterTools searches label, description, and keywords (case-insensitive).
 * For any query string:
 *   1. Every result matches the query in at least one of: label, description, keywords
 *   2. No tool that matches is omitted from the results
 *   3. An empty query returns all tools
 *   4. Results are a subset of the input
 */

// Build the same shape that CommandPalette uses internally
const TOOLS = TOOL_REGISTRY.map((t) => ({
  path: t.path,
  label: t.name,
  category: t.category,
  icon: t.icon,
  description: t.description,
  keywords: t.keywords ?? [],
}));

function toolMatchesQuery(tool: (typeof TOOLS)[number], q: string): boolean {
  return (
    tool.label.toLowerCase().includes(q) ||
    tool.description.toLowerCase().includes(q) ||
    tool.keywords.some((k) => k.toLowerCase().includes(q))
  );
}

describe("Property 5: CommandPalette filter returns only matching tools", () => {
  it("every result matches the query in label, description, or keywords", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (query) => {
        const results = filterTools(TOOLS, query);
        const q = query.toLowerCase();
        return results.every((t) => toolMatchesQuery(t, q));
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
        return TOOLS.every((t) =>
          toolMatchesQuery(t, q) ? resultPaths.has(t.path) : true,
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
        const allPaths = new Set(TOOLS.map((t) => t.path));
        return results.every((t) => allPaths.has(t.path));
      }),
      { numRuns: 100 },
    );
  });
});
