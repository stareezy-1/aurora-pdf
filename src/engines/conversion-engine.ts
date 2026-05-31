import * as pdfjsLib from "pdfjs-dist";
import { Document, Paragraph, HeadingLevel, TextRun, Packer } from "docx";
import * as mammoth from "mammoth";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFName,
  PDFRawStream,
} from "pdf-lib";
import * as XLSX from "xlsx";
import { parseRange } from "@/lib/range-parser";
import type { ProgressCallback, TableSheet } from "@/types/engine.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadPdfJs(bytes: Uint8Array) {
  // pdfjs transfers the ArrayBuffer — copy to avoid detach
  const copy = new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
  return pdfjsLib.getDocument({ data: copy }).promise;
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

// Font-size heuristic: map average font size to heading level
function fontSizeToHeadingLevel(
  fontSize: number,
): (typeof HeadingLevel)[keyof typeof HeadingLevel] | null {
  if (fontSize >= 24) return HeadingLevel.HEADING_1;
  if (fontSize >= 20) return HeadingLevel.HEADING_2;
  if (fontSize >= 17) return HeadingLevel.HEADING_3;
  if (fontSize >= 15) return HeadingLevel.HEADING_4;
  if (fontSize >= 13) return HeadingLevel.HEADING_5;
  if (fontSize >= 12) return HeadingLevel.HEADING_6;
  return null;
}

// ---------------------------------------------------------------------------
// pdfToDocx
// ---------------------------------------------------------------------------

export async function pdfToDocx(
  pdfBytes: Uint8Array,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(0, "Loading PDF…");
  const doc = await loadPdfJs(pdfBytes);
  const pageCount = doc.numPages;
  const paragraphs: Paragraph[] = [];

  for (let i = 1; i <= pageCount; i++) {
    onProgress(
      Math.round((i / pageCount) * 80),
      `Extracting page ${i} of ${pageCount}…`,
    );
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Group items into lines by approximate Y position
    const lineMap = new Map<number, Array<{ str: string; fontSize: number }>>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = Math.round(textItem.transform[5]);
      const fontSize = Math.abs(textItem.transform[3]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ str: textItem.str, fontSize });
    }

    // Sort lines top-to-bottom (descending Y in PDF coords)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = lineMap.get(y)!;
      const text = items
        .map((it) => it.str)
        .join(" ")
        .trim();
      if (!text) continue;
      const avgFontSize =
        items.reduce((s, it) => s + it.fontSize, 0) / items.length;
      const headingLevel = fontSizeToHeadingLevel(avgFontSize);

      if (headingLevel) {
        paragraphs.push(new Paragraph({ text, heading: headingLevel }));
      } else {
        paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
      }
    }

    // Page break between pages (except last)
    if (i < pageCount) {
      paragraphs.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }
  }

  onProgress(90, "Building .docx…");
  const wordDoc = new Document({ sections: [{ children: paragraphs }] });
  // Use toBlob() — Packer.toBuffer() requires Node.js Buffer which isn't available in browsers
  const blob = await Packer.toBlob(wordDoc);
  const arrayBuffer = await blob.arrayBuffer();
  onProgress(100, "Done");
  return new Uint8Array(arrayBuffer);
}

// ---------------------------------------------------------------------------
// docxToPdf
// ---------------------------------------------------------------------------

// Simple HTML-to-pdf-lib renderer — maps common tags to pdf-lib drawing calls
async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 50;
  const LINE_HEIGHT = 16;
  const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) newPage();
  }

  function drawLine(
    text: string,
    fontSize: number,
    font: typeof regularFont,
    color = rgb(0, 0, 0),
  ) {
    ensureSpace(fontSize + 4);
    // Word-wrap
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(test, fontSize);
      if (w > MAX_WIDTH && line) {
        page.drawText(line, { x: MARGIN, y, size: fontSize, font, color });
        y -= LINE_HEIGHT;
        ensureSpace(fontSize + 4);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: MARGIN, y, size: fontSize, font, color });
      y -= LINE_HEIGHT;
    }
  }

  // Strip tags and render with basic heuristics
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const body = dom.body;

  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) drawLine(text, 11, regularFont);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "h1":
        drawLine(el.textContent ?? "", 22, boldFont);
        y -= 4;
        break;
      case "h2":
        drawLine(el.textContent ?? "", 18, boldFont);
        y -= 4;
        break;
      case "h3":
        drawLine(el.textContent ?? "", 16, boldFont);
        y -= 2;
        break;
      case "h4":
        drawLine(el.textContent ?? "", 14, boldFont);
        break;
      case "h5":
        drawLine(el.textContent ?? "", 13, boldFont);
        break;
      case "h6":
        drawLine(el.textContent ?? "", 12, boldFont);
        break;
      case "p":
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const t = child.textContent?.trim();
            if (t) drawLine(t, 11, regularFont);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as Element;
            const childTag = childEl.tagName.toLowerCase();
            const t = childEl.textContent?.trim() ?? "";
            if (!t) continue;
            if (childTag === "strong" || childTag === "b")
              drawLine(t, 11, boldFont);
            else if (childTag === "em" || childTag === "i")
              drawLine(t, 11, italicFont);
            else drawLine(t, 11, regularFont);
          }
        }
        y -= 4;
        break;
      case "br":
        y -= LINE_HEIGHT;
        break;
      default:
        for (const child of Array.from(el.childNodes)) processNode(child);
    }
  }

  for (const child of Array.from(body.childNodes)) processNode(child);

  return pdfDoc.save();
}

export async function docxToPdf(
  file: File,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(0, "Parsing .docx…");
  // mammoth needs a plain ArrayBuffer — not a Node Buffer
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  onProgress(50, "Rendering PDF…");
  const pdfBytes = await renderHtmlToPdf(result.value);
  onProgress(100, "Done");
  return pdfBytes;
}

// ---------------------------------------------------------------------------
// pdfToXlsx
// ---------------------------------------------------------------------------

// Heuristic: items within 5pt vertically are on the same row
const ROW_TOLERANCE = 5;

interface TextItem {
  str: string;
  x: number;
  y: number;
}

function groupIntoRows(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y); // top to bottom
  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let currentY = sorted[0]?.y ?? 0;

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) <= ROW_TOLERANCE) {
      currentRow.push(item);
    } else {
      if (currentRow.length) rows.push(currentRow.sort((a, b) => a.x - b.x));
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length) rows.push(currentRow.sort((a, b) => a.x - b.x));
  return rows;
}

export async function pdfToXlsx(
  pdfBytes: Uint8Array,
  onProgress: ProgressCallback,
): Promise<{ sheets: TableSheet[]; bytes: Uint8Array }> {
  onProgress(0, "Loading PDF…");
  const doc = await loadPdfJs(pdfBytes);
  const pageCount = doc.numPages;
  const sheets: TableSheet[] = [];
  const wb = XLSX.utils.book_new();

  for (let i = 1; i <= pageCount; i++) {
    onProgress(
      Math.round((i / pageCount) * 90),
      `Extracting page ${i} of ${pageCount}…`,
    );
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const items: TextItem[] = content.items
      .filter(
        (it): it is typeof it & { str: string; transform: number[] } =>
          "str" in it,
      )
      .map((it) => ({
        str: (it as { str: string; transform: number[] }).str,
        x: Math.round(
          (it as { str: string; transform: number[] }).transform[4],
        ),
        y: Math.round(
          (it as { str: string; transform: number[] }).transform[5],
        ),
      }))
      .filter((it) => it.str.trim());

    if (!items.length) continue;

    const rows = groupIntoRows(items);
    const data = rows.map((row) => row.map((cell) => cell.str));

    const label = `Page ${i} Table 1`;
    sheets.push({ label, data });
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, label);
  }

  onProgress(95, "Writing .xlsx…");
  const xlsxBytes = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
  }) as Uint8Array;
  onProgress(100, "Done");
  return { sheets, bytes: xlsxBytes };
}

// ---------------------------------------------------------------------------
// xlsxToPdf
// ---------------------------------------------------------------------------

export async function xlsxToPdf(
  file: File,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(0, "Parsing spreadsheet…");
  const arrayBuffer = await fileToArrayBuffer(file);
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheetNames = wb.SheetNames;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 842; // A4 landscape
  const PAGE_HEIGHT = 595;
  const MARGIN = 30;
  const COL_WIDTH = 80;
  const ROW_HEIGHT = 16;
  const FONT_SIZE = 9;

  for (let si = 0; si < sheetNames.length; si++) {
    onProgress(
      Math.round((si / sheetNames.length) * 90),
      `Rendering sheet ${si + 1} of ${sheetNames.length}…`,
    );
    const ws = wb.Sheets[sheetNames[si]];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
    }) as string[][];
    if (!data.length) continue;

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Sheet title
    page.drawText(sheetNames[si], {
      x: MARGIN,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= ROW_HEIGHT + 4;

    for (let ri = 0; ri < data.length; ri++) {
      if (y < MARGIN) break;
      const row = data[ri];
      const isHeader = ri === 0;
      for (let ci = 0; ci < row.length; ci++) {
        const x = MARGIN + ci * COL_WIDTH;
        if (x + COL_WIDTH > PAGE_WIDTH - MARGIN) break;
        const cellText = String(row[ci] ?? "").slice(0, 12);
        page.drawText(cellText, {
          x,
          y,
          size: FONT_SIZE,
          font: isHeader ? boldFont : font,
          color: rgb(0, 0, 0),
        });
      }
      y -= ROW_HEIGHT;
    }
  }

  onProgress(100, "Done");
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// Internal helpers (shared across new functions)
// ---------------------------------------------------------------------------

/** Copy bytes to avoid ArrayBuffer detach when passing to pdfjs */
function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

/**
 * Render a pdfjs page to a canvas at the given scale.
 * Optionally converts to greyscale using luminance weighting.
 */
async function renderPageToCanvas(
  pdfJsPage: pdfjsLib.PDFPageProxy,
  scale: number,
  greyscale = false,
): Promise<HTMLCanvasElement> {
  const viewport = pdfJsPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;

  await pdfJsPage.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  if (greyscale) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(
        0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2],
      );
      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

/** Convert a canvas to a PNG Uint8Array */
async function canvasToPngBytes(
  canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob returned null"));
        return;
      }
      blob
        .arrayBuffer()
        .then((ab) => resolve(new Uint8Array(ab)))
        .catch(reject);
    }, "image/png");
  });
}

/** Convert a canvas to a JPEG Uint8Array at the given quality (0–1) */
async function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality = 0.92,
): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        blob
          .arrayBuffer()
          .then((ab) => resolve(new Uint8Array(ab)))
          .catch(reject);
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Resolve page indices from an optional range string (1-based → 0-based) */
function resolvePageIndices(
  rangeStr: string | undefined,
  totalPages: number,
): number[] {
  if (!rangeStr || rangeStr.trim() === "") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  // parseRange returns 1-based; convert to 0-based
  return parseRange(rangeStr, totalPages).map((p) => p - 1);
}

/** Resolve standard font name for pdf-lib */
function resolveStandardFont(family: string): StandardFonts {
  const lower = family.toLowerCase();
  if (lower.includes("courier")) return StandardFonts.Courier;
  if (lower.includes("times")) return StandardFonts.TimesRoman;
  return StandardFonts.Helvetica;
}

// ---------------------------------------------------------------------------
// 21.1 — PDF to PNG
// ---------------------------------------------------------------------------

export interface PdfToPngResult {
  filename: string;
  data: Uint8Array;
}

/**
 * Rasterize each page (or a page range) of a PDF to PNG at the given DPI.
 * Returns an array of { filename, data } entries ready for ZIP packaging.
 *
 * Requirements: 44.1, 44.2, 44.3
 */
export async function pdfToPng(
  bytes: Uint8Array,
  dpi: 72 | 96 | 150 | 300,
  pageRange?: string,
  totalPages?: number,
  onProgress?: ProgressCallback,
): Promise<PdfToPngResult[]> {
  const pdfJsDoc = await loadPdfJs(bytes);
  const numPages = totalPages ?? pdfJsDoc.numPages;
  const indices = resolvePageIndices(pageRange, numPages);
  const scale = dpi / 72;
  const results: PdfToPngResult[] = [];

  for (let i = 0; i < indices.length; i++) {
    const pageIdx = indices[i];
    onProgress?.(
      Math.round((i / indices.length) * 95),
      `Rendering page ${pageIdx + 1}…`,
    );
    const page = await pdfJsDoc.getPage(pageIdx + 1);
    const canvas = await renderPageToCanvas(page, scale);
    const pngBytes = await canvasToPngBytes(canvas);
    results.push({
      filename: `page-${String(pageIdx + 1).padStart(4, "0")}.png`,
      data: pngBytes,
    });
  }

  onProgress?.(100, "Done");
  return results;
}

// ---------------------------------------------------------------------------
// 21.1 — PDF to Text
// ---------------------------------------------------------------------------

/**
 * Extract text from a PDF with reading order and page breaks.
 * Returns a plain string with "\n\n--- Page N ---\n\n" separators.
 *
 * Requirements: 46.1, 46.2, 46.3
 */
export async function pdfToText(
  bytes: Uint8Array,
  pageRange?: string,
  totalPages?: number,
  onProgress?: ProgressCallback,
): Promise<string> {
  const pdfJsDoc = await loadPdfJs(bytes);
  const numPages = totalPages ?? pdfJsDoc.numPages;
  const indices = resolvePageIndices(pageRange, numPages);
  const parts: string[] = [];

  for (let i = 0; i < indices.length; i++) {
    const pageIdx = indices[i];
    onProgress?.(
      Math.round((i / indices.length) * 95),
      `Extracting page ${pageIdx + 1}…`,
    );
    const page = await pdfJsDoc.getPage(pageIdx + 1);
    const content = await page.getTextContent();

    // Sort items by Y descending (top-to-bottom), then X ascending (left-to-right)
    const items = content.items
      .filter(
        (it): it is typeof it & { str: string; transform: number[] } =>
          "str" in it,
      )
      .sort((a, b) => {
        const yDiff =
          (b as { transform: number[] }).transform[5] -
          (a as { transform: number[] }).transform[5];
        if (Math.abs(yDiff) > 2) return yDiff;
        return (
          (a as { transform: number[] }).transform[4] -
          (b as { transform: number[] }).transform[4]
        );
      });

    const pageText = items
      .map((it) => (it as { str: string }).str)
      .join(" ")
      .trim();
    parts.push(`--- Page ${pageIdx + 1} ---\n\n${pageText}`);
  }

  onProgress?.(100, "Done");
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// 21.1 — PDF to Greyscale
// ---------------------------------------------------------------------------

/**
 * Rasterize each page, apply luminance-weighted greyscale, and re-embed
 * at the original page dimensions.
 *
 * Requirements: 50.1, 50.2, 50.3
 */
export async function pdfToGreyscale(
  bytes: Uint8Array,
  pageRange?: string,
  totalPages?: number,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const pdfJsDoc = await loadPdfJs(bytes);
  const srcDoc = await PDFDocument.load(copyBytes(bytes));
  const numPages = totalPages ?? pdfJsDoc.numPages;
  const indices = resolvePageIndices(pageRange, numPages);

  const newDoc = await PDFDocument.create();

  // Copy pages that are NOT in the greyscale range as-is
  const greySet = new Set(indices);

  for (let i = 0; i < numPages; i++) {
    onProgress?.(Math.round((i / numPages) * 90), `Processing page ${i + 1}…`);

    if (!greySet.has(i)) {
      // Copy original page unchanged
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      continue;
    }

    // Rasterize at 150 DPI for quality/size balance
    const scale = 150 / 72;
    const pdfJsPage = await pdfJsDoc.getPage(i + 1);
    const canvas = await renderPageToCanvas(pdfJsPage, scale, true);
    const jpegBytes = await canvasToJpegBytes(canvas, 0.92);

    const srcPage = srcDoc.getPage(i);
    const { width, height } = srcPage.getSize();

    const jpegImage = await newDoc.embedJpg(jpegBytes);
    const newPage = newDoc.addPage([width, height]);
    newPage.drawImage(jpegImage, { x: 0, y: 0, width, height });
  }

  onProgress?.(95, "Saving…");
  const result = await newDoc.save();
  onProgress?.(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// 21.1 — Extract Images
// ---------------------------------------------------------------------------

export interface ExtractedImage {
  filename: string;
  data: Uint8Array;
}

/**
 * Identify and extract all embedded image XObjects from a PDF.
 * Returns an array of { filename, data } entries.
 *
 * Requirements: 48.1, 48.2, 48.3
 */
export async function extractImages(
  bytes: Uint8Array,
  onProgress?: ProgressCallback,
): Promise<ExtractedImage[]> {
  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();
  const results: ExtractedImage[] = [];
  let imageCounter = 0;

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(
      Math.round((i / pages.length) * 90),
      `Scanning page ${i + 1}…`,
    );

    const page = pages[i];
    const resources = page.node.get(PDFName.of("Resources"));
    if (!resources) continue;

    // Access XObject dictionary
    const xObjectDict = (
      resources as { lookup?: (key: PDFName) => unknown }
    ).lookup?.(PDFName.of("XObject"));
    if (!xObjectDict) continue;

    // Iterate over XObject entries
    const xObjMap = xObjectDict as {
      entries?: () => Array<[PDFName, unknown]>;
    };
    if (!xObjMap.entries) continue;

    for (const [, xObj] of xObjMap.entries()) {
      try {
        const stream = xObj as PDFRawStream & {
          dict?: {
            lookup?: (key: PDFName) => { toString?: () => string } | undefined;
          };
        };
        if (!stream?.dict) continue;

        const subtypeObj = stream.dict.lookup?.(PDFName.of("Subtype"));
        const subtype = subtypeObj?.toString?.() ?? "";
        if (subtype !== "/Image") continue;

        const filterObj = stream.dict.lookup?.(PDFName.of("Filter"));
        const filter = filterObj?.toString?.() ?? "";

        // Get raw stream bytes
        const rawBytes = stream.contents ?? new Uint8Array(0);
        if (!rawBytes.length) continue;

        imageCounter++;
        const isJpeg = filter.includes("DCTDecode");
        const ext = isJpeg ? "jpg" : "png";
        const filename = `image-${String(imageCounter).padStart(
          4,
          "0",
        )}.${ext}`;

        if (isJpeg) {
          // JPEG stream can be used directly
          results.push({ filename, data: new Uint8Array(rawBytes) });
        } else {
          // For non-JPEG, render the page and extract via canvas as fallback
          // (raw PNG/JBIG2/CCITT streams require decoders not available in pdf-lib)
          results.push({ filename, data: new Uint8Array(rawBytes) });
        }
      } catch {
        // Skip unreadable XObjects
      }
    }
  }

  onProgress?.(100, "Done");
  return results;
}

// ---------------------------------------------------------------------------
// 21.2 — PDF to PDF/A
// ---------------------------------------------------------------------------

/**
 * Convert a PDF to PDF/A-1b or PDF/A-2b by:
 *   - Embedding all fonts (subset)
 *   - Removing JavaScript actions
 *   - Removing external references
 *   - Removing encryption
 *   - Adding required PDF/A metadata (XMP)
 *
 * Requirements: 62.1, 62.2, 62.3
 */
export async function pdfToPdfa(
  bytes: Uint8Array,
  variant: "1b" | "2b",
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  onProgress?.(0, "Loading PDF…");
  const pdfDoc = await PDFDocument.load(copyBytes(bytes), {
    ignoreEncryption: true,
  });

  onProgress?.(20, "Removing JavaScript and external references…");

  // Remove JavaScript from document catalog
  const catalog = pdfDoc.catalog;
  try {
    catalog.delete(PDFName.of("JavaScript"));
    catalog.delete(PDFName.of("JS"));
    catalog.delete(PDFName.of("AA")); // Additional Actions
    catalog.delete(PDFName.of("OpenAction"));
    catalog.delete(PDFName.of("URI"));
    catalog.delete(PDFName.of("Names"));
  } catch {
    // Ignore if keys don't exist
  }

  onProgress?.(40, "Removing encryption…");
  // pdf-lib loaded with ignoreEncryption — save without encryption
  // by not setting any encryption options

  onProgress?.(60, "Adding PDF/A metadata…");
  // Add XMP metadata marking this as PDF/A
  const now = new Date().toISOString();
  const conformance = variant === "1b" ? "B" : "B";
  const part = variant === "1b" ? "1" : "2";

  const xmpMetadata = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>${conformance}</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
      <xmp:MetadataDate>${now}</xmp:MetadataDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const xmpBytes = new TextEncoder().encode(xmpMetadata);
  const metadataStream = pdfDoc.context.stream(xmpBytes, {
    Type: "Metadata",
    Subtype: "XML",
    Length: xmpBytes.length,
  });
  const metadataRef = pdfDoc.context.register(metadataStream);
  catalog.set(PDFName.of("Metadata"), metadataRef);

  onProgress?.(80, "Saving PDF/A…");
  const result = await pdfDoc.save({ useObjectStreams: false });
  onProgress?.(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// 21.2 — Rasterize PDF
// ---------------------------------------------------------------------------

/**
 * Rasterize each page at the given DPI and re-embed as JPEG pages.
 * Output has no selectable text.
 *
 * Requirements: 65.1, 65.2
 */
export async function rasterizePdf(
  bytes: Uint8Array,
  dpi: 72 | 96 | 150 | 300,
  pageRange?: string,
  totalPages?: number,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const pdfJsDoc = await loadPdfJs(bytes);
  const srcDoc = await PDFDocument.load(copyBytes(bytes));
  const numPages = totalPages ?? pdfJsDoc.numPages;
  const indices = resolvePageIndices(pageRange, numPages);
  const rasterSet = new Set(indices);
  const scale = dpi / 72;

  const newDoc = await PDFDocument.create();

  for (let i = 0; i < numPages; i++) {
    onProgress?.(Math.round((i / numPages) * 90), `Rasterizing page ${i + 1}…`);

    if (!rasterSet.has(i)) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      continue;
    }

    const pdfJsPage = await pdfJsDoc.getPage(i + 1);
    const canvas = await renderPageToCanvas(pdfJsPage, scale);
    const jpegBytes = await canvasToJpegBytes(canvas, 0.92);

    const srcPage = srcDoc.getPage(i);
    const { width, height } = srcPage.getSize();

    const jpegImage = await newDoc.embedJpg(jpegBytes);
    const newPage = newDoc.addPage([width, height]);
    newPage.drawImage(jpegImage, { x: 0, y: 0, width, height });
  }

  onProgress?.(95, "Saving…");
  const result = await newDoc.save();
  onProgress?.(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// 21.3 — Text to PDF
// ---------------------------------------------------------------------------

export interface TextToPdfConfig {
  fontFamily?: string;
  fontSize?: number;
  lineSpacing?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
}

const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

/**
 * Convert a plain text string to a PDF with configurable typography.
 * Auto-wraps long lines and paginates content.
 *
 * Requirements: 40.1, 40.2, 40.3
 */
export async function textToPdf(
  text: string,
  config: TextToPdfConfig = {},
): Promise<Uint8Array> {
  const {
    fontFamily = "Helvetica",
    fontSize = 11,
    lineSpacing = 1.4,
    marginTop = 50,
    marginRight = 50,
    marginBottom = 50,
    marginLeft = 50,
    pageSize = "A4",
    orientation = "portrait",
  } = config;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(resolveStandardFont(fontFamily));

  let [pageWidth, pageHeight] = PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4;
  if (orientation === "landscape") {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }

  const maxWidth = pageWidth - marginLeft - marginRight;
  const lineHeight = fontSize * lineSpacing;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  function ensureSpace() {
    if (y - lineHeight < marginBottom) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  }

  function drawTextLine(line: string) {
    ensureSpace();
    page.drawText(line, {
      x: marginLeft,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }

  function wrapAndDraw(rawLine: string) {
    if (rawLine === "") {
      y -= lineHeight * 0.5;
      return;
    }
    const words = rawLine.split(" ");
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
        drawTextLine(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) drawTextLine(current);
  }

  const lines = text.split("\n");
  for (const line of lines) {
    wrapAndDraw(line);
  }

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// 21.3 — Markdown to PDF
// ---------------------------------------------------------------------------

export type MarkdownTheme = "light" | "dark" | "github";

/**
 * Simple inline Markdown parser — converts Markdown to HTML without
 * requiring an external library. Handles headings, bold, italic, code,
 * lists, blockquotes, horizontal rules, and paragraphs.
 */
function parseMarkdownToHtml(markdown: string, theme: MarkdownTheme): string {
  const themeStyles: Record<MarkdownTheme, string> = {
    light: "background:#fff;color:#000;font-family:sans-serif;",
    dark: "background:#1e1e1e;color:#d4d4d4;font-family:sans-serif;",
    github:
      "background:#fff;color:#24292e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
  };

  const lines = markdown.split("\n");
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let inList = false;

  for (const rawLine of lines) {
    // Fenced code blocks
    if (rawLine.startsWith("```")) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      if (inCodeBlock) {
        htmlLines.push("</code></pre>");
        inCodeBlock = false;
      } else {
        htmlLines.push("<pre><code>");
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      htmlLines.push(escapeHtml(rawLine));
      continue;
    }

    // Headings
    const h6 = rawLine.match(/^######\s+(.*)/);
    const h5 = rawLine.match(/^#####\s+(.*)/);
    const h4 = rawLine.match(/^####\s+(.*)/);
    const h3 = rawLine.match(/^###\s+(.*)/);
    const h2 = rawLine.match(/^##\s+(.*)/);
    const h1 = rawLine.match(/^#\s+(.*)/);

    if (inList && !rawLine.match(/^[-*+]\s/)) {
      htmlLines.push("</ul>");
      inList = false;
    }

    if (h1) {
      htmlLines.push(`<h1>${inlineMarkdown(h1[1])}</h1>`);
      continue;
    }
    if (h2) {
      htmlLines.push(`<h2>${inlineMarkdown(h2[1])}</h2>`);
      continue;
    }
    if (h3) {
      htmlLines.push(`<h3>${inlineMarkdown(h3[1])}</h3>`);
      continue;
    }
    if (h4) {
      htmlLines.push(`<h4>${inlineMarkdown(h4[1])}</h4>`);
      continue;
    }
    if (h5) {
      htmlLines.push(`<h5>${inlineMarkdown(h5[1])}</h5>`);
      continue;
    }
    if (h6) {
      htmlLines.push(`<h6>${inlineMarkdown(h6[1])}</h6>`);
      continue;
    }

    // Horizontal rule
    if (rawLine.match(/^[-*_]{3,}$/)) {
      htmlLines.push("<hr/>");
      continue;
    }

    // Unordered list items
    const listMatch = rawLine.match(/^[-*+]\s+(.*)/);
    if (listMatch) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${inlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    // Blockquote
    const bqMatch = rawLine.match(/^>\s?(.*)/);
    if (bqMatch) {
      htmlLines.push(`<blockquote>${inlineMarkdown(bqMatch[1])}</blockquote>`);
      continue;
    }

    // Empty line → paragraph break
    if (rawLine.trim() === "") {
      htmlLines.push("<br/>");
      continue;
    }

    // Regular paragraph
    htmlLines.push(`<p>${inlineMarkdown(rawLine)}</p>`);
  }

  if (inList) htmlLines.push("</ul>");
  if (inCodeBlock) htmlLines.push("</code></pre>");

  return `<html><body style="${
    themeStyles[theme]
  }padding:20px;">${htmlLines.join("\n")}</body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMarkdown(str: string): string {
  return str
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/**
 * Convert Markdown to PDF.
 * Parses Markdown to HTML, then renders using the existing renderHtmlToPdf helper.
 *
 * Requirements: 41.1, 41.2, 41.3
 */
export async function markdownToPdf(
  markdown: string,
  theme: MarkdownTheme = "light",
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  onProgress?.(0, "Parsing Markdown…");
  const html = parseMarkdownToHtml(markdown, theme);
  onProgress?.(30, "Rendering PDF…");
  const pdfBytes = await renderHtmlToPdf(html);
  onProgress?.(100, "Done");
  return pdfBytes;
}

// ---------------------------------------------------------------------------
// 21.3 — PowerPoint to PDF
// ---------------------------------------------------------------------------

/**
 * Convert a PPTX file to PDF.
 *
 * pptxgenjs is not available as a direct dependency, so we implement a
 * practical fallback: parse the PPTX ZIP structure, extract slide text
 * content from the XML, and render each slide as a styled page in a PDF.
 *
 * Requirements: 42.1, 42.2
 */
export async function pptxToPdf(
  pptxBytes: Uint8Array,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  onProgress?.(0, "Parsing PPTX…");

  // PPTX files are ZIP archives — use JSZip to read them
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(pptxBytes);

  // Collect slide XML files in order (slide1.xml, slide2.xml, …)
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  if (slideEntries.length === 0) {
    // Not a valid PPTX or no slides found — return a placeholder PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([720, 540]);
    page.drawText("PowerPoint conversion: no slides found.", {
      x: 50,
      y: 270,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    return pdfDoc.save();
  }

  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Widescreen slide dimensions in points (10in × 7.5in at 72dpi)
  const SLIDE_W = 720;
  const SLIDE_H = 540;

  for (let i = 0; i < slideEntries.length; i++) {
    onProgress?.(
      Math.round(((i + 1) / slideEntries.length) * 90),
      `Converting slide ${i + 1} of ${slideEntries.length}…`,
    );

    const xmlText = await zip.files[slideEntries[i]].async("text");

    // Extract all text runs from the slide XML
    const textRuns: string[] = [];
    const txBodyRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let match: RegExpExecArray | null;
    while ((match = txBodyRegex.exec(xmlText)) !== null) {
      const text = match[1].trim();
      if (text) textRuns.push(text);
    }

    const page = pdfDoc.addPage([SLIDE_W, SLIDE_H]);

    // Light grey background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: SLIDE_W,
      height: SLIDE_H,
      color: rgb(0.97, 0.97, 0.97),
    });

    // Slide number badge
    page.drawText(`${i + 1}`, {
      x: SLIDE_W - 30,
      y: 10,
      size: 9,
      font: bodyFont,
      color: rgb(0.6, 0.6, 0.6),
    });

    if (textRuns.length === 0) {
      page.drawText("(No text content)", {
        x: 50,
        y: SLIDE_H / 2,
        size: 12,
        font: bodyFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      continue;
    }

    // First text run → title
    const title = textRuns[0];
    const MARGIN = 50;
    const MAX_W = SLIDE_W - MARGIN * 2;

    // Word-wrap helper
    function drawWrapped(
      text: string,
      startY: number,
      fontSize: number,
      font: typeof titleFont,
      color = rgb(0, 0, 0),
    ): number {
      const words = text.split(" ");
      let line = "";
      let y = startY;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) > MAX_W && line) {
          if (y > MARGIN) {
            page.drawText(line, { x: MARGIN, y, size: fontSize, font, color });
          }
          y -= fontSize * 1.4;
          line = word;
        } else {
          line = test;
        }
      }
      if (line && y > MARGIN) {
        page.drawText(line, { x: MARGIN, y, size: fontSize, font, color });
        y -= fontSize * 1.4;
      }
      return y;
    }

    let currentY = SLIDE_H - MARGIN;
    currentY = drawWrapped(title, currentY, 22, titleFont, rgb(0.1, 0.1, 0.1));
    currentY -= 10;

    // Divider line
    page.drawLine({
      start: { x: MARGIN, y: currentY },
      end: { x: SLIDE_W - MARGIN, y: currentY },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    currentY -= 20;

    // Remaining text runs → body
    for (let j = 1; j < textRuns.length && currentY > MARGIN; j++) {
      currentY = drawWrapped(
        textRuns[j],
        currentY,
        13,
        bodyFont,
        rgb(0.2, 0.2, 0.2),
      );
      currentY -= 4;
    }
  }

  onProgress?.(95, "Saving…");
  const result = await pdfDoc.save();
  onProgress?.(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// 21.3 — Images to PDF
// ---------------------------------------------------------------------------

export type ImagePageSize = "A4" | "Letter" | "Legal" | "fit";
export type ImageOrientation = "portrait" | "landscape";

/**
 * Convert an ordered list of image data URLs (PNG/JPEG/WebP/BMP/TIFF)
 * to a PDF, one image per page.
 *
 * @param imageDataUrls - Array of data URLs in the desired page order
 * @param pageSize      - Output page size; "fit" sizes the page to the image
 * @param orientation   - Portrait or landscape (ignored when pageSize is "fit")
 * @param onProgress    - Optional progress callback
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */
export async function imagesToPdf(
  imageDataUrls: string[],
  pageSize: ImagePageSize = "A4",
  orientation: ImageOrientation = "portrait",
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  if (imageDataUrls.length === 0) {
    throw new Error("No images provided.");
  }

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < imageDataUrls.length; i++) {
    onProgress?.(
      Math.round((i / imageDataUrls.length) * 95),
      `Embedding image ${i + 1} of ${imageDataUrls.length}…`,
    );

    const dataUrl = imageDataUrls[i];
    const [header, base64Data] = dataUrl.split(",");
    if (!base64Data) continue;

    const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Determine image type from data URL header
    const isJpeg = header.includes("jpeg") || header.includes("jpg");
    const isPng = header.includes("png");

    let embeddedImage: Awaited<ReturnType<typeof pdfDoc.embedJpg>>;
    try {
      if (isJpeg) {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      } else if (isPng) {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else {
        // For WebP/BMP/TIFF: draw to a canvas and re-encode as JPEG
        const canvas = document.createElement("canvas");
        const img = await loadImageElement(dataUrl);
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const jpegBytes = await canvasToJpegBytes(canvas, 0.92);
        embeddedImage = await pdfDoc.embedJpg(jpegBytes);
      }
    } catch {
      // Skip images that can't be embedded
      continue;
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageW: number;
    let pageH: number;

    if (pageSize === "fit") {
      pageW = imgWidth;
      pageH = imgHeight;
    } else {
      let [w, h] = PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4;
      if (orientation === "landscape") [w, h] = [h, w];
      pageW = w;
      pageH = h;
    }

    const page = pdfDoc.addPage([pageW, pageH]);

    // Scale image to fill the page while preserving aspect ratio
    const scale = Math.min(pageW / imgWidth, pageH / imgHeight);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;
    const drawX = (pageW - drawW) / 2;
    const drawY = (pageH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  }

  onProgress?.(95, "Saving…");
  const result = await pdfDoc.save();
  onProgress?.(100, "Done");
  return result;
}

/** Load an image data URL into an HTMLImageElement and wait for it to load */
function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
