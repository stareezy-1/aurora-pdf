import * as pdfjsLib from "pdfjs-dist";
import { Document, Paragraph, HeadingLevel, TextRun, Packer } from "docx";
import * as mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
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
