/**
 * Organization Engine
 *
 * Provides high-level PDF organization operations:
 *   Sub-task 15.1 — Merge, extract, reverse, rotate, insert blank pages
 *   Sub-task 15.2 — Page numbering, header/footer, crop
 *   Sub-task 15.3 — Remove blank pages, bookmarks, TOC, page labels, Bates numbering
 *
 * All functions are pure — no React, no DOM (except canvas for blank-page detection).
 * Uses pdf-lib for all PDF manipulation.
 */

import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFArray,
  PDFDict,
  PDFString,
  PDFRef,
} from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type { ProgressCallback } from "@/types/engine.types";
import type {
  CropConfig,
  HeaderFooterConfig,
  PageNumberConfig,
} from "@/types/tool.types";
import { parseRange } from "@/lib/range-parser";
import {
  InvalidPageRangeError,
  PageRangeOutOfBoundsError,
  CropMarginsError,
} from "@/lib/errors";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Copy bytes so pdfjs doesn't detach the original ArrayBuffer */
function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

async function loadPdfJs(bytes: Uint8Array) {
  return pdfjsLib.getDocument({ data: copyBytes(bytes) }).promise;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

function resolveStandardFont(
  fontFamily: string,
): (typeof StandardFonts)[keyof typeof StandardFonts] {
  const lower = fontFamily.toLowerCase();
  if (
    lower.includes("times") ||
    lower.includes("georgia") ||
    lower.includes("palatino") ||
    lower.includes("garamond") ||
    lower.includes("bookman")
  )
    return StandardFonts.TimesRoman;
  if (lower.includes("courier") || lower.includes("monospace"))
    return StandardFonts.Courier;
  return StandardFonts.Helvetica;
}

/**
 * Parse a page range string and return 0-based indices.
 * Empty string → all pages.
 * Throws InvalidPageRangeError for malformed strings,
 * PageRangeOutOfBoundsError for out-of-bounds pages.
 */
function resolvePageIndices(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  // Validate for out-of-bounds before calling parseRange (which clamps silently)
  const segments = rangeStr.split(",");
  for (const seg of segments) {
    const trimmed = seg.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const hi = Math.max(
        parseInt(rangeMatch[1], 10),
        parseInt(rangeMatch[2], 10),
      );
      if (hi > totalPages) throw new PageRangeOutOfBoundsError(hi, totalPages);
    } else {
      const singleMatch = trimmed.match(/^(\d+)$/);
      if (singleMatch) {
        const page = parseInt(singleMatch[1], 10);
        if (page > totalPages)
          throw new PageRangeOutOfBoundsError(page, totalPages);
      }
    }
  }

  // parseRange returns 1-based page numbers
  const oneBased = parseRange(rangeStr, totalPages);
  if (oneBased.length === 0) {
    throw new InvalidPageRangeError(rangeStr);
  }
  return oneBased.map((p) => p - 1); // convert to 0-based
}

// ---------------------------------------------------------------------------
// Sub-task 15.1 — Merge, extract, and page manipulation
// ---------------------------------------------------------------------------

/**
 * Merge 2–20 PDFs in user-specified order.
 * Password-protected files must be decrypted before passing their bytes.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export async function mergePdfs(
  fileBuffers: Uint8Array[],
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  if (fileBuffers.length < 2 || fileBuffers.length > 20) {
    throw new Error(
      `mergePdfs requires between 2 and 20 files (got ${fileBuffers.length}).`,
    );
  }
  const merged = await PDFDocument.create();
  for (let i = 0; i < fileBuffers.length; i++) {
    onProgress?.(
      Math.round((i / fileBuffers.length) * 90),
      `Merging file ${i + 1} of ${fileBuffers.length}…`,
    );
    const src = await PDFDocument.load(copyBytes(fileBuffers[i]));
    const indices = src.getPageIndices();
    const copied = await merged.copyPages(src, indices);
    copied.forEach((p) => merged.addPage(p));
  }
  onProgress?.(95, "Saving…");
  const result = await merged.save();
  onProgress?.(100, "Done");
  return result;
}

/**
 * Extract pages specified by a Page_Range string into a new PDF.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export async function extractPageRange(
  bytes: Uint8Array,
  pageRange: string,
  totalPages: number,
): Promise<Uint8Array> {
  const indices = resolvePageIndices(pageRange, totalPages);
  const src = await PDFDocument.load(copyBytes(bytes));
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(src, indices);
  copied.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

/**
 * Reverse page order — all pages or a specific range.
 * Requirements: 53.1, 53.2
 */
export async function reversePages(
  bytes: Uint8Array,
  pageRange?: string,
  totalPages?: number,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(copyBytes(bytes));
  const total = src.getPageCount();
  const effectiveTotal = totalPages ?? total;

  let indicesToReverse: number[];
  if (pageRange && pageRange.trim() !== "") {
    indicesToReverse = resolvePageIndices(pageRange, effectiveTotal);
  } else {
    indicesToReverse = Array.from({ length: total }, (_, i) => i);
  }

  // Build the new page order: keep pages outside the range in place,
  // reverse the pages inside the range.
  const order = Array.from({ length: total }, (_, i) => i);
  const reversed = [...indicesToReverse].reverse();
  indicesToReverse.forEach((origIdx, pos) => {
    order[origIdx] = reversed[pos];
  });

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(src, order);
  copied.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

/**
 * Rotate specific pages by given degree amounts.
 * Requirements: 12.1, 12.2
 */
export async function rotatePageRange(
  bytes: Uint8Array,
  rotations: Array<{ pageIndex: number; degrees: 90 | 180 | 270 }>,
  totalPages: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();
  for (const { pageIndex, degrees: deg } of rotations) {
    if (pageIndex >= 0 && pageIndex < totalPages && pageIndex < pages.length) {
      pages[pageIndex].setRotation(degrees(deg));
    }
  }
  return pdfDoc.save();
}

/** Standard page size dimensions in points [width, height] (portrait) */
const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

/**
 * Insert a blank page at the specified position (0-based index).
 * Requirements: 14.1, 14.2
 */
export async function insertBlankPage(
  bytes: Uint8Array,
  position: number,
  pageSize: "A4" | "Letter" | "Legal",
  orientation: "portrait" | "landscape",
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const [w, h] = PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4;
  const [width, height] = orientation === "landscape" ? [h, w] : [w, h];
  pdfDoc.insertPage(position, [width, height]);
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// Sub-task 15.2 — Page numbering, header/footer, and crop
// ---------------------------------------------------------------------------

/**
 * Apply page numbers to a PDF with extended config support
 * (starting number, page range).
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export async function applyPageNumbers(
  bytes: Uint8Array,
  config: PageNumberConfig & {
    startingNumber?: number;
    pageRange?: string;
  },
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const font = await pdfDoc.embedFont(resolveStandardFont(config.fontFamily));
  const { r, g, b } = hexToRgb(config.color);
  const startNum = config.startingNumber ?? 1;

  const targetIndices =
    config.pageRange && config.pageRange.trim() !== ""
      ? resolvePageIndices(config.pageRange, totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

  for (let pos = 0; pos < targetIndices.length; pos++) {
    const i = targetIndices[pos];
    onProgress?.(
      Math.round((pos / targetIndices.length) * 100),
      `Adding page number ${pos + 1} of ${targetIndices.length}…`,
    );
    const displayNum = startNum + pos;
    const label =
      config.format === "1"
        ? String(displayNum)
        : config.format === "Page 1"
        ? `Page ${displayNum}`
        : `${displayNum}/${totalPages}`;

    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    let textWidth = 0;
    try {
      textWidth = font.widthOfTextAtSize(label, config.fontSize);
    } catch {
      textWidth = label.length * config.fontSize * 0.5;
    }

    let x = 0;
    let y = 0;
    switch (config.position) {
      case "bottom-center":
        x = (pageWidth - textWidth) / 2;
        y = 20;
        break;
      case "bottom-left":
        x = 20;
        y = 20;
        break;
      case "bottom-right":
        x = pageWidth - textWidth - 20;
        y = 20;
        break;
      case "top-center":
        x = (pageWidth - textWidth) / 2;
        y = pageHeight - 30;
        break;
      default:
        x = (pageWidth - textWidth) / 2;
        y = 20;
    }

    page.drawText(label, {
      x,
      y,
      size: config.fontSize,
      font,
      color: rgb(r, g, b),
    });
  }

  onProgress?.(100, "Done");
  return pdfDoc.save();
}

/** Resolve dynamic tokens in header/footer text */
function resolveTokens(
  template: string,
  pageNum: number,
  totalPages: number,
  filename: string,
): string {
  const date = new Date().toLocaleDateString();
  return template
    .replace(/\{page\}/g, String(pageNum))
    .replace(/\{total\}/g, String(totalPages))
    .replace(/\{date\}/g, date)
    .replace(/\{filename\}/g, filename);
}

/**
 * Apply header and footer text to a PDF.
 * Supports 6-zone layout (header: left/center/right, footer: left/center/right).
 * Supports dynamic tokens: {page}, {total}, {date}, {filename}.
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */
export async function applyHeaderFooter(
  bytes: Uint8Array,
  config: HeaderFooterConfig,
  onProgress?: ProgressCallback,
  filename = "document.pdf",
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const font = await pdfDoc.embedFont(resolveStandardFont(config.fontFamily));
  const { r, g, b } = hexToRgb(config.color);
  const fontSize = config.fontSize;
  const margin = config.marginOffset;

  const targetIndices =
    config.pageRange && config.pageRange.trim() !== ""
      ? resolvePageIndices(config.pageRange, totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

  for (let pos = 0; pos < targetIndices.length; pos++) {
    const i = targetIndices[pos];
    onProgress?.(
      Math.round((pos / targetIndices.length) * 90),
      `Adding header/footer to page ${pos + 1} of ${targetIndices.length}…`,
    );
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const pageNum = i + 1;

    const drawZone = (
      text: string,
      zone: "left" | "center" | "right",
      isHeader: boolean,
    ) => {
      if (!text) return;
      const resolved = resolveTokens(text, pageNum, totalPages, filename);
      let textWidth = 0;
      try {
        textWidth = font.widthOfTextAtSize(resolved, fontSize);
      } catch {
        textWidth = resolved.length * fontSize * 0.5;
      }

      let x: number;
      if (zone === "left") {
        x = margin;
      } else if (zone === "right") {
        x = pageWidth - textWidth - margin;
      } else {
        x = (pageWidth - textWidth) / 2;
      }
      const y = isHeader ? pageHeight - margin - fontSize : margin;

      try {
        page.drawText(resolved, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r, g, b),
        });
      } catch {
        // skip unencodable text
      }
    };

    drawZone(config.headerLeft, "left", true);
    drawZone(config.headerCenter, "center", true);
    drawZone(config.headerRight, "right", true);
    drawZone(config.footerLeft, "left", false);
    drawZone(config.footerCenter, "center", false);
    drawZone(config.footerRight, "right", false);
  }

  onProgress?.(100, "Done");
  return pdfDoc.save();
}

/**
 * Crop pages by updating MediaBox (and CropBox if present).
 * Validates that margins > 0 and don't reduce page to zero or below.
 * Requirements: 24.1, 24.2, 24.3, 24.5
 */
export async function cropPages(
  bytes: Uint8Array,
  config: CropConfig,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const targetIndices =
    config.pageRange && config.pageRange.trim() !== ""
      ? resolvePageIndices(config.pageRange, totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

  for (const i of targetIndices) {
    const page = pages[i];
    const { width, height } = page.getSize();

    if (
      config.top < 0 ||
      config.right < 0 ||
      config.bottom < 0 ||
      config.left < 0
    ) {
      throw new CropMarginsError();
    }

    const newWidth = width - config.left - config.right;
    const newHeight = height - config.top - config.bottom;

    if (newWidth <= 0 || newHeight <= 0) {
      throw new CropMarginsError();
    }

    // MediaBox in PDF is [llx, lly, urx, ury] (lower-left to upper-right)
    const newBox = pdfDoc.context.obj([
      config.left,
      config.bottom,
      width - config.right,
      height - config.top,
    ]);

    const pageNode = page.node;
    pageNode.set(PDFName.of("MediaBox"), newBox);

    // Update CropBox if present
    if (pageNode.has(PDFName.of("CropBox"))) {
      pageNode.set(PDFName.of("CropBox"), newBox);
    }
  }

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// Sub-task 15.3 — Remove blank pages
// ---------------------------------------------------------------------------

/** Default threshold: 99% white pixels = blank */
const DEFAULT_BLANK_THRESHOLD = 0.99;

/**
 * Detect blank pages by rendering each page to a canvas and analyzing pixel data.
 * Returns 0-based indices of pages classified as blank.
 * Requirements: 25.1
 */
export async function detectBlankPages(
  bytes: Uint8Array,
  threshold = DEFAULT_BLANK_THRESHOLD,
): Promise<number[]> {
  const pdfJsDoc = await loadPdfJs(bytes);
  const pageCount = pdfJsDoc.numPages;
  const blankIndices: number[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = await pdfJsDoc.getPage(i + 1);
    const viewport = page.getViewport({ scale: 0.5 }); // small scale for speed
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let whitePixels = 0;
    const totalPixels = canvas.width * canvas.height;

    for (let p = 0; p < data.length; p += 4) {
      // Consider a pixel "white" if all RGB channels are >= 250
      if (data[p] >= 250 && data[p + 1] >= 250 && data[p + 2] >= 250) {
        whitePixels++;
      }
    }

    if (whitePixels / totalPixels >= threshold) {
      blankIndices.push(i);
    }
  }

  return blankIndices;
}

/**
 * Remove blank pages from a PDF.
 * If pageIndicesToRemove is provided, only those pages are removed (user deselection).
 * Otherwise, auto-detects blank pages using the threshold.
 * Requirements: 25.1, 25.2, 25.3
 */
export async function removeBlankPages(
  bytes: Uint8Array,
  threshold = DEFAULT_BLANK_THRESHOLD,
  pageIndicesToRemove?: number[],
): Promise<{ bytes: Uint8Array; removedIndices: number[] }> {
  const indicesToRemove =
    pageIndicesToRemove ?? (await detectBlankPages(bytes, threshold));

  if (indicesToRemove.length === 0) {
    return { bytes, removedIndices: [] };
  }

  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const total = pdfDoc.getPageCount();
  const toRemove = new Set(indicesToRemove);
  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !toRemove.has(i),
  );

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(pdfDoc, keepIndices);
  copied.forEach((p) => newDoc.addPage(p));

  return {
    bytes: await newDoc.save(),
    removedIndices: indicesToRemove,
  };
}

// ---------------------------------------------------------------------------
// Sub-task 15.3 — Bookmarks
// ---------------------------------------------------------------------------

export interface BookmarkNode {
  title: string;
  /** 0-based page index */
  pageIndex: number;
  /** Up to 3 levels of nesting */
  children?: BookmarkNode[];
}

/**
 * Embed a bookmark tree into a PDF using pdf-lib's low-level context API.
 * Supports up to 3 levels of nesting.
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
 */
export async function applyBookmarks(
  bytes: Uint8Array,
  bookmarkTree: BookmarkNode[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const context = pdfDoc.context;
  const pageCount = pdfDoc.getPageCount();

  if (bookmarkTree.length === 0) {
    return pdfDoc.save();
  }

  /**
   * Create a GoTo destination: [pageRef, /XYZ, null, null, null]
   * navigates to the top of the given page.
   */
  function makeDestination(pageIndex: number): PDFArray {
    const clampedIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
    const pageRef = pdfDoc.getPage(clampedIndex).ref;
    return context.obj([
      pageRef,
      PDFName.of("XYZ"),
      PDFNull,
      PDFNull,
      PDFNull,
    ]) as PDFArray;
  }

  /**
   * Recursively build outline item dicts, link siblings, and return their refs.
   */
  function buildItems(nodes: BookmarkNode[], parentRef: PDFRef): PDFRef[] {
    const refs: PDFRef[] = [];

    for (const node of nodes) {
      const itemDict = context.obj({
        Title: PDFString.of(node.title),
        Parent: parentRef,
        Dest: makeDestination(node.pageIndex),
      }) as PDFDict;

      const itemRef = context.register(itemDict);
      refs.push(itemRef);

      // Recurse into children (depth limited to 3 levels by the caller)
      if (node.children && node.children.length > 0) {
        const childRefs = buildItems(node.children, itemRef);
        if (childRefs.length > 0) {
          itemDict.set(PDFName.of("First"), childRefs[0]);
          itemDict.set(PDFName.of("Last"), childRefs[childRefs.length - 1]);
          // Negative Count means the subtree is collapsed by default
          itemDict.set(PDFName.of("Count"), PDFNumber.of(-childRefs.length));
          // Link child siblings
          for (let j = 0; j < childRefs.length; j++) {
            const childDict = context.lookup(childRefs[j]) as PDFDict;
            if (j > 0) childDict.set(PDFName.of("Prev"), childRefs[j - 1]);
            if (j < childRefs.length - 1)
              childDict.set(PDFName.of("Next"), childRefs[j + 1]);
          }
        }
      }
    }

    // Link top-level siblings at this depth
    for (let i = 0; i < refs.length; i++) {
      const dict = context.lookup(refs[i]) as PDFDict;
      if (i > 0) dict.set(PDFName.of("Prev"), refs[i - 1]);
      if (i < refs.length - 1) dict.set(PDFName.of("Next"), refs[i + 1]);
    }

    return refs;
  }

  // Create the Outlines root dict
  const outlinesDict = context.obj({ Type: PDFName.of("Outlines") }) as PDFDict;
  const outlinesRef = context.register(outlinesDict);

  const itemRefs = buildItems(bookmarkTree, outlinesRef);

  if (itemRefs.length > 0) {
    outlinesDict.set(PDFName.of("First"), itemRefs[0]);
    outlinesDict.set(PDFName.of("Last"), itemRefs[itemRefs.length - 1]);
    outlinesDict.set(PDFName.of("Count"), PDFNumber.of(itemRefs.length));
  }

  // Register Outlines in the document catalog
  pdfDoc.catalog.set(PDFName.of("Outlines"), outlinesRef);
  pdfDoc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// Sub-task 15.3 — Table of Contents
// ---------------------------------------------------------------------------

export interface TocConfig {
  /** 0-based page index where the TOC page is inserted (0 = before first page) */
  insertAtPage: number;
  fontFamily?: string;
  fontSize?: number;
  lineSpacing?: number; // multiplier, default 1.5
}

/**
 * Generate a Table of Contents page from a bookmark tree and insert it into the PDF.
 * Updates all bookmark page references to account for the inserted TOC page.
 * Requirements: 37.1, 37.2, 37.3, 37.4
 */
export async function generateTableOfContents(
  bytes: Uint8Array,
  bookmarkTree: BookmarkNode[],
  config: TocConfig,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const fontName = resolveStandardFont(config.fontFamily ?? "Helvetica");
  const font = await pdfDoc.embedFont(fontName);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = config.fontSize ?? 11;
  const lineSpacing = config.lineSpacing ?? 1.5;
  const lineHeight = fontSize * lineSpacing;
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 50;
  const maxY = PAGE_H - MARGIN;
  const minY = MARGIN;

  // Flatten bookmark tree into a list of { title, pageIndex, depth }
  interface TocEntry {
    title: string;
    pageIndex: number;
    depth: number;
  }
  function flatten(nodes: BookmarkNode[], depth = 0): TocEntry[] {
    const result: TocEntry[] = [];
    for (const node of nodes) {
      result.push({ title: node.title, pageIndex: node.pageIndex, depth });
      if (node.children && node.children.length > 0) {
        result.push(...flatten(node.children, depth + 1));
      }
    }
    return result;
  }
  const entries = flatten(bookmarkTree);

  // Insert a blank TOC page at the specified position
  const insertPos = Math.max(
    0,
    Math.min(config.insertAtPage, pdfDoc.getPageCount()),
  );
  const tocPage = pdfDoc.insertPage(insertPos, [PAGE_W, PAGE_H]);

  // Draw title
  tocPage.drawText("Table of Contents", {
    x: MARGIN,
    y: maxY - fontSize,
    size: fontSize + 4,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  let y = maxY - fontSize - lineHeight * 2;

  for (const entry of entries) {
    if (y < minY) break; // stop if we run out of space on the TOC page

    const indent = entry.depth * 16;
    // Page number is offset by 1 because we inserted the TOC page
    const displayPage =
      entry.pageIndex + 1 + (entry.pageIndex >= insertPos ? 1 : 0);
    const pageLabel = String(displayPage);
    let titleWidth = 0;
    let pageWidth = 0;
    try {
      titleWidth = font.widthOfTextAtSize(entry.title, fontSize);
      pageWidth = font.widthOfTextAtSize(pageLabel, fontSize);
    } catch {
      titleWidth = entry.title.length * fontSize * 0.5;
      pageWidth = pageLabel.length * fontSize * 0.5;
    }

    // Draw title
    tocPage.drawText(entry.title, {
      x: MARGIN + indent,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Draw dots leader
    const dotsStart = MARGIN + indent + titleWidth + 4;
    const dotsEnd = PAGE_W - MARGIN - pageWidth - 4;
    if (dotsEnd > dotsStart) {
      const dotSpacing = font.widthOfTextAtSize(".", fontSize) + 1;
      let dx = dotsStart;
      while (dx < dotsEnd) {
        try {
          tocPage.drawText(".", {
            x: dx,
            y,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        } catch {
          /* skip */
        }
        dx += dotSpacing;
      }
    }

    // Draw page number
    tocPage.drawText(pageLabel, {
      x: PAGE_W - MARGIN - pageWidth,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
  }

  // Update bookmark page refs to account for the inserted TOC page
  function shiftBookmarks(nodes: BookmarkNode[]): BookmarkNode[] {
    return nodes.map((node) => ({
      ...node,
      pageIndex:
        node.pageIndex >= insertPos ? node.pageIndex + 1 : node.pageIndex,
      children: node.children ? shiftBookmarks(node.children) : undefined,
    }));
  }
  const shiftedTree = shiftBookmarks(bookmarkTree);

  // Re-apply bookmarks with updated page refs
  const withToc = await pdfDoc.save();
  return applyBookmarks(withToc, shiftedTree);
}

// ---------------------------------------------------------------------------
// Sub-task 15.3 — Page Labels
// ---------------------------------------------------------------------------

export type PageLabelStyle =
  | "arabic" // 1, 2, 3 …
  | "roman-upper" // I, II, III …
  | "roman-lower" // i, ii, iii …
  | "alpha-upper" // A, B, C …
  | "alpha-lower" // a, b, c …
  | "none"; // no numbering, prefix only

export interface PageLabelRange {
  /** 0-based start page index */
  startPage: number;
  style: PageLabelStyle;
  /** Optional prefix string (e.g. "App-") */
  prefix?: string;
  /** Starting number for this range (default 1) */
  startAt?: number;
}

const LABEL_STYLE_MAP: Record<PageLabelStyle, string | null> = {
  arabic: "D",
  "roman-upper": "R",
  "roman-lower": "r",
  "alpha-upper": "A",
  "alpha-lower": "a",
  none: null,
};

/**
 * Embed a PageLabels dictionary into the PDF.
 * Requirements: 38.1, 38.2, 38.3
 */
export async function applyPageLabels(
  bytes: Uint8Array,
  labelRanges: PageLabelRange[],
): Promise<Uint8Array> {
  if (labelRanges.length === 0) {
    return bytes;
  }

  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const context = pdfDoc.context;

  // Sort ranges by startPage ascending
  const sorted = [...labelRanges].sort((a, b) => a.startPage - b.startPage);

  // Build the Nums array: [pageIndex, labelDict, pageIndex, labelDict, ...]
  const numsEntries: Array<PDFNumber | PDFDict> = [];

  for (const range of sorted) {
    const labelDict = context.obj({}) as PDFDict;

    const styleCode = LABEL_STYLE_MAP[range.style];
    if (styleCode !== null) {
      labelDict.set(PDFName.of("S"), PDFName.of(styleCode));
    }
    if (range.prefix) {
      labelDict.set(PDFName.of("P"), PDFString.of(range.prefix));
    }
    if (range.startAt !== undefined && range.startAt !== 1) {
      labelDict.set(PDFName.of("St"), PDFNumber.of(range.startAt));
    }

    numsEntries.push(PDFNumber.of(range.startPage));
    numsEntries.push(labelDict);
  }

  const numsArray = context.obj(numsEntries) as PDFArray;
  const pageLabelsDict = context.obj({ Nums: numsArray }) as PDFDict;
  const pageLabelsRef = context.register(pageLabelsDict);

  pdfDoc.catalog.set(PDFName.of("PageLabels"), pageLabelsRef);

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// Sub-task 15.3 — Bates Numbering
// ---------------------------------------------------------------------------

export type BatesPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface BatesConfig {
  /** Starting sequential number (default 1) */
  startNumber?: number;
  /** Total digits with zero-padding (e.g. 6 → "000001") */
  digits?: number;
  /** Prefix text prepended before the number */
  prefix?: string;
  /** Suffix text appended after the number */
  suffix?: string;
  fontSize?: number;
  color?: string;
  position?: BatesPosition;
}

/**
 * Apply sequential Bates numbers across one or more PDF files.
 * Numbers are sequential across all files in the provided order.
 * Returns one output Uint8Array per input file.
 * Requirements: 39.1, 39.2, 39.3
 */
export async function applyBatesNumbering(
  fileBuffers: Uint8Array[],
  config: BatesConfig = {},
  onProgress?: ProgressCallback,
): Promise<Uint8Array[]> {
  const {
    startNumber = 1,
    digits = 6,
    prefix = "",
    suffix = "",
    fontSize = 9,
    color = "#000000",
    position = "bottom-right",
  } = config;

  const { r, g, b } = hexToRgb(color);
  let counter = startNumber;
  const results: Uint8Array[] = [];

  for (let fileIdx = 0; fileIdx < fileBuffers.length; fileIdx++) {
    const pdfDoc = await PDFDocument.load(copyBytes(fileBuffers[fileIdx]));
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      onProgress?.(
        Math.round(
          ((fileIdx * pages.length + pageIdx) /
            (fileBuffers.length * pages.length)) *
            100,
        ),
        `Bates numbering file ${fileIdx + 1}, page ${pageIdx + 1}…`,
      );

      const label = prefix + String(counter).padStart(digits, "0") + suffix;
      counter++;

      const page = pages[pageIdx];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      let textWidth = 0;
      try {
        textWidth = font.widthOfTextAtSize(label, fontSize);
      } catch {
        textWidth = label.length * fontSize * 0.5;
      }

      const MARGIN = 18;
      let x = 0;
      let y = 0;

      switch (position) {
        case "top-left":
          x = MARGIN;
          y = pageHeight - MARGIN - fontSize;
          break;
        case "top-center":
          x = (pageWidth - textWidth) / 2;
          y = pageHeight - MARGIN - fontSize;
          break;
        case "top-right":
          x = pageWidth - textWidth - MARGIN;
          y = pageHeight - MARGIN - fontSize;
          break;
        case "bottom-left":
          x = MARGIN;
          y = MARGIN;
          break;
        case "bottom-center":
          x = (pageWidth - textWidth) / 2;
          y = MARGIN;
          break;
        case "bottom-right":
        default:
          x = pageWidth - textWidth - MARGIN;
          y = MARGIN;
          break;
      }

      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });
    }

    results.push(await pdfDoc.save());
  }

  onProgress?.(100, "Done");
  return results;
}
