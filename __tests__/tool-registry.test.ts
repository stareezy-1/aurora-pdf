// Unit tests for Tool Registry
// Feature: aurora-pdf-feature-parity
// Requirements: 21.2

import { describe, it, expect } from "vitest";
import {
  TOOL_REGISTRY,
  getToolsByCategory,
  findTool,
  type ToolCategory,
} from "../src/lib/tool-registry";

// ── TOOL_REGISTRY shape ───────────────────────────────────────────────────────

describe("TOOL_REGISTRY", () => {
  it("contains at least 30 tools (original 15 + 15 P1 organize tools)", () => {
    expect(TOOL_REGISTRY.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has a non-empty id", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.id).toBeTruthy();
      expect(typeof tool.id).toBe("string");
    }
  });

  it("every entry has a path starting with /", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.path).toMatch(/^\//);
    }
  });

  it("every entry has a non-empty name", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.name).toBeTruthy();
    }
  });

  it("every entry has a non-empty icon", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.icon).toBeTruthy();
    }
  });

  it("every entry has a non-empty color", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.color).toBeTruthy();
    }
  });

  it("every entry has a non-empty bg", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.bg).toBeTruthy();
    }
  });

  it("every entry has a valid category", () => {
    const validCategories: ToolCategory[] = [
      "convert-to",
      "convert-from",
      "edit",
      "organize",
      "optimize",
      "secure",
    ];
    for (const tool of TOOL_REGISTRY) {
      expect(validCategories).toContain(tool.category);
    }
  });

  it("every entry has a non-empty description", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.description).toBeTruthy();
    }
  });

  it("every entry has a component (React.lazy exotic component)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.component).toBeDefined();
      // React.lazy returns an object with $$typeof === Symbol(react.lazy)
      expect(tool.component).toHaveProperty("$$typeof");
    }
  });

  it("all ids are unique", () => {
    const ids = TOOL_REGISTRY.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all paths are unique", () => {
    const paths = TOOL_REGISTRY.map((t) => t.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("id matches the path segment (path === '/' + id)", () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.path).toBe(`/${tool.id}`);
    }
  });
});

// ── findTool ──────────────────────────────────────────────────────────────────

describe("findTool", () => {
  it("returns the correct entry for 'compress'", () => {
    const tool = findTool("compress");
    expect(tool).toBeDefined();
    expect(tool!.id).toBe("compress");
    expect(tool!.path).toBe("/compress");
    expect(tool!.name).toBe("Compress PDF");
    expect(tool!.category).toBe("optimize");
  });

  it("returns the correct entry for 'sign'", () => {
    const tool = findTool("sign");
    expect(tool).toBeDefined();
    expect(tool!.id).toBe("sign");
    expect(tool!.path).toBe("/sign");
    expect(tool!.name).toBe("Sign PDF");
    expect(tool!.category).toBe("edit");
  });

  it("returns the correct entry for 'protect'", () => {
    const tool = findTool("protect");
    expect(tool).toBeDefined();
    expect(tool!.id).toBe("protect");
    expect(tool!.path).toBe("/protect");
    expect(tool!.name).toBe("Protect PDF");
    expect(tool!.category).toBe("secure");
  });

  it("returns the correct entry for 'searchable-pdf'", () => {
    const tool = findTool("searchable-pdf");
    expect(tool).toBeDefined();
    expect(tool!.id).toBe("searchable-pdf");
    expect(tool!.name).toBe("Searchable PDF OCR");
  });

  it("returns undefined for an unknown id", () => {
    expect(findTool("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(findTool("")).toBeUndefined();
  });

  it("is case-sensitive (uppercase id returns undefined)", () => {
    expect(findTool("Compress")).toBeUndefined();
    expect(findTool("SIGN")).toBeUndefined();
  });

  it("returns the correct entry for every tool in the registry", () => {
    for (const tool of TOOL_REGISTRY) {
      const found = findTool(tool.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(tool.id);
    }
  });
});

// ── getToolsByCategory ────────────────────────────────────────────────────────

describe("getToolsByCategory", () => {
  it("returns a non-empty array for 'optimize'", () => {
    const tools = getToolsByCategory("optimize");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      expect(t.category).toBe("optimize");
    }
  });

  it("returns a non-empty array for 'convert-to'", () => {
    const tools = getToolsByCategory("convert-to");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      expect(t.category).toBe("convert-to");
    }
  });

  it("returns a non-empty array for 'convert-from'", () => {
    const tools = getToolsByCategory("convert-from");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      expect(t.category).toBe("convert-from");
    }
  });

  it("returns a non-empty array for 'edit'", () => {
    const tools = getToolsByCategory("edit");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      expect(t.category).toBe("edit");
    }
  });

  it("returns a non-empty array for 'organize'", () => {
    const tools = getToolsByCategory("organize");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      expect(t.category).toBe("organize");
    }
  });

  it("returns a non-empty array for 'secure'", () => {
    const tools = getToolsByCategory("secure");
    expect(tools.length).toBeGreaterThan(0);
    for (const t of tools) {
      expect(t.category).toBe("secure");
    }
  });

  it("all category results together cover all tools in the registry", () => {
    const categories: ToolCategory[] = [
      "convert-to",
      "convert-from",
      "edit",
      "organize",
      "optimize",
      "secure",
    ];
    const allFromCategories = categories.flatMap((c) => getToolsByCategory(c));
    expect(allFromCategories).toHaveLength(TOOL_REGISTRY.length);
  });

  it("compress is in 'optimize' category", () => {
    const tools = getToolsByCategory("optimize");
    expect(tools.some((t) => t.id === "compress")).toBe(true);
  });

  it("protect is in 'secure' category", () => {
    const tools = getToolsByCategory("secure");
    expect(tools.some((t) => t.id === "protect")).toBe(true);
  });

  it("split and organize are in 'organize' category", () => {
    const tools = getToolsByCategory("organize");
    expect(tools.some((t) => t.id === "split")).toBe(true);
    expect(tools.some((t) => t.id === "organize")).toBe(true);
  });

  it("edit, sign, and watermark are in 'edit' category", () => {
    const tools = getToolsByCategory("edit");
    expect(tools.some((t) => t.id === "edit")).toBe(true);
    expect(tools.some((t) => t.id === "sign")).toBe(true);
    expect(tools.some((t) => t.id === "watermark")).toBe(true);
  });
});
