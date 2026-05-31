import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type {
  ProgressCallback,
  TextAnnotation,
  OcrPageResult,
  ShapeAnnotation,
  SearchablePdfPage,
} from "@/types/engine.types";
import type {
  CompressionLevel,
  WatermarkConfig,
  SignatureConfig,
  DpiOption,
  PageNumberConfig,
} from "@/types/tool.types";

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

/** Copy bytes so pdfjs doesn't detach the original ArrayBuffer */
function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

async function fileToBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

async function loadPdfJs(bytes: Uint8Array) {
  // pdfjs transfers the ArrayBuffer — always pass a copy
  return pdfjsLib.getDocument({ data: copyBytes(bytes) }).promise;
}

// ---------------------------------------------------------------------------
// compress — re-render each page as JPEG at target quality
// ---------------------------------------------------------------------------

const JPEG_QUALITY: Record<CompressionLevel, number> = {
  low: 0.85,
  standard: 0.65,
  high: 0.4,
};

export async function compress(
  file: File,
  level: CompressionLevel,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(0, "Loading PDF…");
  const bytes = await fileToBytes(file);
  const quality = JPEG_QUALITY[level];

  // Load original with pdf-lib just to get page sizes
  const srcDoc = await PDFDocument.load(copyBytes(bytes));
  const srcPages = srcDoc.getPages();

  // Create a brand-new document — this is what actually reduces size.
  // We render each page via pdfjs → JPEG → embed into a clean page.
  // The new doc has NO original content streams, only the re-encoded JPEG.
  const newDoc = await PDFDocument.create();
  const pdfJsDoc = await loadPdfJs(bytes);
  const pageCount = pdfJsDoc.numPages;

  for (let i = 0; i < pageCount; i++) {
    onProgress(
      Math.round((i / pageCount) * 85),
      `Compressing page ${i + 1} of ${pageCount}…`,
    );

    // Render via pdfjs at 1× scale
    const pdfJsPage = await pdfJsDoc.getPage(i + 1);
    const viewport = pdfJsPage.getViewport({ scale: 1.0 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await pdfJsPage.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    // Encode as JPEG at target quality
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1];
    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // Embed into a fresh page with the same dimensions as the original
    const jpegImage = await newDoc.embedJpg(imgBytes);
    const { width, height } = srcPages[i].getSize();
    const newPage = newDoc.addPage([width, height]);
    newPage.drawImage(jpegImage, { x: 0, y: 0, width, height });
  }

  onProgress(95, "Saving…");
  const result = await newDoc.save({ useObjectStreams: true });
  onProgress(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// renderPageAsJpeg
// ---------------------------------------------------------------------------

export async function renderPageAsJpeg(
  pdfBytes: Uint8Array,
  pageIndex: number,
  dpi: DpiOption,
): Promise<Blob> {
  const scale = dpi / 72;
  const doc = await loadPdfJs(pdfBytes);
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      0.92,
    );
  });
}

// ---------------------------------------------------------------------------
// getPageCount
// ---------------------------------------------------------------------------

export async function getPageCount(pdfBytes: Uint8Array): Promise<number> {
  const doc = await loadPdfJs(pdfBytes);
  return doc.numPages;
}

// ---------------------------------------------------------------------------
// renderThumbnail
// ---------------------------------------------------------------------------

export async function renderThumbnail(
  pdfBytes: Uint8Array,
  pageIndex: number,
): Promise<string> {
  const doc = await loadPdfJs(pdfBytes);
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 0.35 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return canvas.toDataURL("image/jpeg", 0.75);
}

// ---------------------------------------------------------------------------
// renderPagePreview — higher quality for sign/watermark preview
// ---------------------------------------------------------------------------

export async function renderPagePreview(
  pdfBytes: Uint8Array,
  pageIndex: number,
): Promise<string> {
  const doc = await loadPdfJs(pdfBytes);
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 1.2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  return canvas.toDataURL("image/jpeg", 0.9);
}

// ---------------------------------------------------------------------------
// deletePages
// ---------------------------------------------------------------------------

export async function deletePages(
  pdfBytes: Uint8Array,
  pageIndices: number[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const total = pdfDoc.getPageCount();
  const toDelete = new Set(pageIndices);
  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !toDelete.has(i),
  );
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(pdfDoc, keepIndices);
  copied.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

// ---------------------------------------------------------------------------
// reorderPages
// ---------------------------------------------------------------------------

export async function reorderPages(
  pdfBytes: Uint8Array,
  newOrder: number[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(pdfDoc, newOrder);
  copied.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

// ---------------------------------------------------------------------------
// addTextAnnotation
// ---------------------------------------------------------------------------

export async function addTextAnnotation(
  pdfBytes: Uint8Array,
  annotation: TextAnnotation,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPage(annotation.pageIndex);
  const { r, g, b } = hexToRgb(annotation.color);
  page.drawText(annotation.text, {
    x: annotation.x,
    y: annotation.y,
    size: annotation.fontSize,
    font,
    color: rgb(r, g, b),
    ...(annotation.opacity !== undefined && annotation.opacity < 100
      ? { opacity: annotation.opacity / 100 }
      : {}),
    ...(annotation.rotation ? { rotate: degrees(annotation.rotation) } : {}),
  });
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// getPageSizes — returns width/height in points for every page
// ---------------------------------------------------------------------------

export async function getPageSizes(
  pdfBytes: Uint8Array,
): Promise<Array<{ width: number; height: number }>> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  return pdfDoc.getPages().map((p) => p.getSize());
}

// ---------------------------------------------------------------------------
// embedImageOverlay — embed a data URL image at normalized (0–1) coordinates
// Used by Edit PDF export to apply image overlays (inserted images, signatures)
// ---------------------------------------------------------------------------

export async function embedImageOverlay(
  pdfBytes: Uint8Array,
  opts: {
    pageIndex: number;
    dataUrl: string;
    x: number; // 0–1 normalized from left
    y: number; // 0–1 normalized from bottom (pdf-lib convention)
    width: number; // 0–1 normalized
    height: number; // 0–1 normalized
  },
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const page = pdfDoc.getPage(opts.pageIndex);
  const { width: pw, height: ph } = page.getSize();
  const base64 = opts.dataUrl.split(",")[1];
  const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const isPng = opts.dataUrl.startsWith("data:image/png");
  const image = isPng
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);
  page.drawImage(image, {
    x: opts.x * pw,
    y: opts.y * ph,
    width: opts.width * pw,
    height: opts.height * ph,
  });
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// embedSignature
// ---------------------------------------------------------------------------

export async function embedSignature(
  pdfBytes: Uint8Array,
  config: SignatureConfig,
): Promise<Uint8Array> {
  if (!config.dataUrl) throw new Error("No signature data URL provided.");
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const page = pdfDoc.getPage(config.pageIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const base64 = config.dataUrl.split(",")[1];
  const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const isPng = config.dataUrl.startsWith("data:image/png");
  const image = isPng
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);
  page.drawImage(image, {
    x: config.x * pageWidth,
    y: (1 - config.y - config.height) * pageHeight,
    width: config.width * pageWidth,
    height: config.height * pageHeight,
  });
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// applyWatermark
// ---------------------------------------------------------------------------

export async function applyWatermark(
  pdfBytes: Uint8Array,
  config: WatermarkConfig,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  // Delegate to the watermark engine which handles the full WatermarkConfig shape
  const { applyWatermark: applyWatermarkEngine } = await import(
    "@/engines/watermark-engine"
  );
  return applyWatermarkEngine(pdfBytes, config, onProgress);
}

// ---------------------------------------------------------------------------
// extractPages
// ---------------------------------------------------------------------------

export async function extractPages(
  pdfBytes: Uint8Array,
  pageIndices: number[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(pdfDoc, pageIndices);
  copied.forEach((p) => newDoc.addPage(p));
  return newDoc.save();
}

// ---------------------------------------------------------------------------
// assembleTextPdf
// ---------------------------------------------------------------------------

export async function assembleTextPdf(
  pages: OcrPageResult[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sorted = [...pages].sort((a, b) => a.imageIndex - b.imageIndex);

  for (const p of sorted) {
    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 40;
    const LINE_H = 13;
    const FONT_SIZE = 10;
    const MAX_W = PAGE_W - MARGIN * 2;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const rawLines = p.text.split("\n");

    for (const rawLine of rawLines) {
      // Replace non-latin1 with space (pdf-lib standard fonts are latin-1 only)
      const line = rawLine.replace(/[^\x20-\xFF]/g, " ").trimEnd();
      if (!line) {
        y -= LINE_H;
        if (y < MARGIN) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          y = PAGE_H - MARGIN;
        }
        continue;
      }

      // Word-wrap
      const words = line.split(" ");
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        let testWidth = 0;
        try {
          testWidth = font.widthOfTextAtSize(test, FONT_SIZE);
        } catch {
          testWidth = test.length * 5.5;
        }
        if (testWidth > MAX_W && current) {
          try {
            page.drawText(current, {
              x: MARGIN,
              y,
              size: FONT_SIZE,
              font,
              color: rgb(0, 0, 0),
            });
          } catch {
            /* skip unencodable */
          }
          y -= LINE_H;
          if (y < MARGIN) {
            page = pdfDoc.addPage([PAGE_W, PAGE_H]);
            y = PAGE_H - MARGIN;
          }
          current = word;
        } else {
          current = test;
        }
      }
      if (current && y >= MARGIN) {
        try {
          page.drawText(current, {
            x: MARGIN,
            y,
            size: FONT_SIZE,
            font,
            color: rgb(0, 0, 0),
          });
        } catch {
          /* skip */
        }
      }
      y -= LINE_H;
      if (y < MARGIN) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
    }
  }
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// isEncrypted / hasTextLayer
// ---------------------------------------------------------------------------

export async function isEncrypted(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(copyBytes(pdfBytes), { ignoreEncryption: false });
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      msg.toLowerCase().includes("encrypt") ||
      msg.toLowerCase().includes("password")
    );
  }
}

export async function hasTextLayer(pdfBytes: Uint8Array): Promise<boolean> {
  const doc = await loadPdfJs(pdfBytes);
  const pageCount = Math.min(doc.numPages, 3);
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    if (content.items.length > 0) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// rotatePages
// ---------------------------------------------------------------------------

export async function rotatePages(
  pdfBytes: Uint8Array,
  rotations: Array<{ pageIndex: number; degrees: 90 | 180 | 270 }>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const pages = pdfDoc.getPages();
  for (const { pageIndex, degrees: deg } of rotations) {
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    pages[pageIndex].setRotation(degrees(deg));
  }
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// duplicatePage
// ---------------------------------------------------------------------------

export async function duplicatePage(
  pdfBytes: Uint8Array,
  pageIndex: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const total = pdfDoc.getPageCount();
  if (pageIndex < 0 || pageIndex >= total) {
    throw new Error(
      `Page index ${pageIndex} is out of range (0–${total - 1}).`,
    );
  }
  const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
  pdfDoc.insertPage(pageIndex + 1, copiedPage);
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// applyDrawOverlay
// ---------------------------------------------------------------------------

export async function applyDrawOverlay(
  pdfBytes: Uint8Array,
  pageIndex: number,
  pathDataUrl: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const page = pdfDoc.getPage(pageIndex);
  const base64 = pathDataUrl.split(",")[1];
  const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pngImage = await pdfDoc.embedPng(pngBytes);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  });
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// applyShapeOverlay
// ---------------------------------------------------------------------------

export async function applyShapeOverlay(
  pdfBytes: Uint8Array,
  pageIndex: number,
  shape: ShapeAnnotation,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const page = pdfDoc.getPage(pageIndex);
  const stroke = hexToRgb(shape.strokeColor);
  const strokeColor = rgb(stroke.r, stroke.g, stroke.b);
  const fillColorValue =
    shape.fillColor !== null ? hexToRgb(shape.fillColor) : null;
  const borderWidth = shape.strokeWidth;
  if (shape.type === "rectangle") {
    page.drawRectangle({
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      borderColor: strokeColor,
      borderWidth,
      ...(fillColorValue !== null
        ? { color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b) }
        : { opacity: 0 }),
    });
  } else if (shape.type === "circle") {
    const xScale = shape.width / 2;
    const yScale = shape.height / 2;
    page.drawEllipse({
      x: shape.x + xScale,
      y: shape.y + yScale,
      xScale,
      yScale,
      borderColor: strokeColor,
      borderWidth,
      ...(fillColorValue !== null
        ? { color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b) }
        : { opacity: 0 }),
    });
  } else if (shape.type === "line") {
    page.drawLine({
      start: { x: shape.x, y: shape.y },
      end: { x: shape.x + shape.width, y: shape.y + shape.height },
      color: strokeColor,
      thickness: borderWidth,
    });
  } else if (shape.type === "arrow") {
    const endX = shape.x + shape.width;
    const endY = shape.y + shape.height;
    // Main line
    page.drawLine({
      start: { x: shape.x, y: shape.y },
      end: { x: endX, y: endY },
      color: strokeColor,
      thickness: borderWidth,
    });
    // Arrowhead — two lines at 30° from the end
    const angle = Math.atan2(shape.height, shape.width);
    const arrowLen = Math.max(borderWidth * 4, 10);
    const arrowAngle = Math.PI / 6;
    page.drawLine({
      start: { x: endX, y: endY },
      end: {
        x: endX - arrowLen * Math.cos(angle - arrowAngle),
        y: endY - arrowLen * Math.sin(angle - arrowAngle),
      },
      color: strokeColor,
      thickness: borderWidth,
    });
    page.drawLine({
      start: { x: endX, y: endY },
      end: {
        x: endX - arrowLen * Math.cos(angle + arrowAngle),
        y: endY - arrowLen * Math.sin(angle + arrowAngle),
      },
      color: strokeColor,
      thickness: borderWidth,
    });
  }
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// applyPageNumbers
// ---------------------------------------------------------------------------

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

export async function applyPageNumbers(
  pdfBytes: Uint8Array,
  config: PageNumberConfig,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const font = await pdfDoc.embedFont(resolveStandardFont(config.fontFamily));
  const { r, g, b } = hexToRgb(config.color);
  for (let i = 0; i < totalPages; i++) {
    onProgress(
      Math.round((i / totalPages) * 100),
      `Adding page number ${i + 1} of ${totalPages}…`,
    );
    let label =
      config.format === "1"
        ? String(i + 1)
        : config.format === "Page 1"
        ? `Page ${i + 1}`
        : `${i + 1}/${totalPages}`;
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    let textWidth = 0;
    try {
      textWidth = font.widthOfTextAtSize(label, config.fontSize);
    } catch {
      textWidth = label.length * config.fontSize * 0.5;
    }
    let x = 0,
      y = 0;
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
  onProgress(100, "Done");
  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// encryptWithPassword — RC4-40 Standard Security Handler Rev 2
// ---------------------------------------------------------------------------

export async function encryptWithPassword(
  pdfBytes: Uint8Array,
  userPassword: string,
): Promise<Uint8Array> {
  // Normalise to a flat xref-table PDF (no xref streams) so our parser works
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const normalised = await pdfDoc.save({ useObjectStreams: false });
  return _encryptRC4_40(normalised, userPassword);
}

/**
 * Full RC4-40 PDF encryption (Standard Security Handler, Revision 2).
 * Implements PDF 1.4 spec §3.5 algorithms 2, 3, 4 AND encrypts every
 * stream and string object with per-object RC4 keys.
 */
function _encryptRC4_40(
  pdfBytes: Uint8Array,
  userPassword: string,
): Uint8Array {
  // ── Primitives ─────────────────────────────────────────────────────────────
  function strToLatin1(s: string): Uint8Array {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return b;
  }
  function toHex(b: Uint8Array): string {
    return Array.from(b)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }

  // MD5 (RFC 1321)
  function md5(data: Uint8Array): Uint8Array {
    const len = data.length;
    const padLen = (len + 9 + 63) & ~63;
    const buf = new Uint8Array(padLen);
    buf.set(data);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, (len * 8) >>> 0, true);
    dv.setUint32(padLen - 4, Math.floor(len / 0x20000000) >>> 0, true);
    const T = Array.from(
      { length: 64 },
      (_, i) => (Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0,
    );
    const S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4,
      11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21,
    ];
    let a = 0x67452301,
      b = 0xefcdab89,
      c = 0x98badcfe,
      d = 0x10325476;
    const w32 = new Uint32Array(buf.buffer);
    for (let i = 0; i < padLen / 4; i += 16) {
      const M = w32.slice(i, i + 16);
      let aa = a,
        bb = b,
        cc = c,
        dd = d;
      for (let j = 0; j < 64; j++) {
        let F: number, g: number;
        if (j < 16) {
          F = (b & c) | (~b & d);
          g = j;
        } else if (j < 32) {
          F = (d & b) | (~d & c);
          g = (5 * j + 1) % 16;
        } else if (j < 48) {
          F = b ^ c ^ d;
          g = (3 * j + 5) % 16;
        } else {
          F = c ^ (b | ~d);
          g = (7 * j) % 16;
        }
        F = (F + a + M[g] + T[j]) >>> 0;
        a = d;
        d = c;
        c = b;
        b = (b + ((F << S[j]) | (F >>> (32 - S[j])))) >>> 0;
      }
      a = (a + aa) >>> 0;
      b = (b + bb) >>> 0;
      c = (c + cc) >>> 0;
      d = (d + dd) >>> 0;
    }
    const r = new Uint8Array(16);
    const rv = new DataView(r.buffer);
    rv.setUint32(0, a, true);
    rv.setUint32(4, b, true);
    rv.setUint32(8, c, true);
    rv.setUint32(12, d, true);
    return r;
  }

  // RC4
  function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
    const S = new Uint8Array(256);
    for (let i = 0; i < 256; i++) S[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + key[i % key.length]) & 0xff;
      [S[i], S[j]] = [S[j], S[i]];
    }
    const out = new Uint8Array(data.length);
    let x = 0,
      y = 0;
    for (let i = 0; i < data.length; i++) {
      x = (x + 1) & 0xff;
      y = (y + S[x]) & 0xff;
      [S[x], S[y]] = [S[y], S[x]];
      out[i] = data[i] ^ S[(S[x] + S[y]) & 0xff];
    }
    return out;
  }

  // ── Key derivation (Algorithm 2) ───────────────────────────────────────────
  const PAD = new Uint8Array([
    0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56,
    0xff, 0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80,
    0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
  ]);
  const KEY_LEN = 5; // 40-bit
  const P = -4; // permissions (allow all)
  const fileId = new Uint8Array(16);
  crypto.getRandomValues(fileId);

  function padPwd(pwd: string): Uint8Array {
    const b = strToLatin1(pwd);
    const r = new Uint8Array(32);
    const n = Math.min(b.length, 32);
    r.set(b.slice(0, n));
    r.set(PAD.slice(0, 32 - n), n);
    return r;
  }

  const userPad = padPwd(userPassword);
  const ownerPad = padPwd(userPassword); // same password for owner

  // Algorithm 3: compute O entry
  const oHash = md5(ownerPad);
  const oKey = oHash.slice(0, KEY_LEN);
  const oEntry = rc4(oKey, userPad);

  // Algorithm 2: compute encryption key
  const pBytes = new Uint8Array(4);
  const pVal = P >>> 0;
  pBytes[0] = pVal & 0xff;
  pBytes[1] = (pVal >> 8) & 0xff;
  pBytes[2] = (pVal >> 16) & 0xff;
  pBytes[3] = (pVal >> 24) & 0xff;
  const keyInput = new Uint8Array([
    ...userPad,
    ...oEntry,
    ...pBytes,
    ...fileId,
  ]);
  const encKey = md5(keyInput).slice(0, KEY_LEN);

  // Algorithm 4: compute U entry
  const uEntry = rc4(encKey, PAD);

  // Per-object key: encKey + 3 bytes of objNum (LE) + 2 bytes of genNum (LE)
  function objectKey(objNum: number, genNum: number): Uint8Array {
    const k = new Uint8Array(KEY_LEN + 5);
    k.set(encKey);
    k[KEY_LEN] = objNum & 0xff;
    k[KEY_LEN + 1] = (objNum >> 8) & 0xff;
    k[KEY_LEN + 2] = (objNum >> 16) & 0xff;
    k[KEY_LEN + 3] = genNum & 0xff;
    k[KEY_LEN + 4] = (genNum >> 8) & 0xff;
    return md5(k).slice(0, Math.min(KEY_LEN + 5, 16));
  }

  // ── Parse & rebuild PDF with encrypted streams ─────────────────────────────
  const src = new TextDecoder("latin1").decode(pdfBytes);

  // Find all indirect objects: "N G obj ... endobj"
  // We'll rebuild the PDF by encrypting stream data and string literals
  const encDict = `<< /Filter /Standard /V 1 /R 2 /Length 40 /P ${P} /O <${toHex(
    oEntry,
  )}> /U <${toHex(uEntry)}> >>`;

  // Find highest object number
  const objRe = /^(\d+)\s+(\d+)\s+obj\b/gm;
  let maxObj = 0;
  for (const m of src.matchAll(objRe))
    maxObj = Math.max(maxObj, parseInt(m[1]));
  const encObjNum = maxObj + 1;

  // Encrypt stream contents
  // Strategy: find each "N G obj ... stream\r?\n ... endstream" block and RC4-encrypt the stream bytes
  const enc = new TextEncoder();

  // Work on raw bytes for stream encryption
  const srcBytes = new Uint8Array(pdfBytes);

  // Build output by scanning for objects and encrypting streams
  const chunks: Uint8Array[] = [];
  let pos = 0;
  const objStartRe = /(\d+)\s+(\d+)\s+obj\b/g;
  const offsets: Array<{ start: number; objNum: number; genNum: number }> = [];

  // Find all object start positions
  for (const m of src.matchAll(objStartRe)) {
    offsets.push({
      start: m.index!,
      objNum: parseInt(m[1]),
      genNum: parseInt(m[2]),
    });
  }

  // For each object, encrypt its stream if it has one
  for (let i = 0; i < offsets.length; i++) {
    const { start, objNum, genNum } = offsets[i];
    const end = i + 1 < offsets.length ? offsets[i + 1].start : src.length;
    const objSrc = src.slice(start, end);

    // Find stream...endstream within this object
    const streamMatch = objSrc.match(/\bstream\r?\n/);
    const endstreamIdx = objSrc.lastIndexOf("endstream");

    if (streamMatch && endstreamIdx > 0) {
      const streamDataStart =
        start + streamMatch.index! + streamMatch[0].length;
      const streamDataEnd = start + endstreamIdx;

      // Copy everything up to stream data start
      chunks.push(srcBytes.slice(pos, streamDataStart));

      // Encrypt the stream data
      const streamData = srcBytes.slice(streamDataStart, streamDataEnd);
      const key = objectKey(objNum, genNum);
      const encrypted = rc4(key, streamData);
      chunks.push(encrypted);

      pos = streamDataEnd;
    }
  }
  // Copy remainder
  chunks.push(srcBytes.slice(pos));

  // Assemble encrypted PDF
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const encPdf = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    encPdf.set(c, off);
    off += c.length;
  }

  // Append encrypt object and updated xref
  const encObjStr = `\n${encObjNum} 0 obj\n${encDict}\nendobj\n`;
  const encObjOffset = encPdf.length;

  // Find trailer in encrypted PDF
  const encSrc = new TextDecoder("latin1").decode(encPdf);
  const trailerMatch = encSrc.match(/trailer\s*<<([^>]*)>>/s);
  let trailerInner = trailerMatch ? trailerMatch[1] : `/Size ${encObjNum + 1}`;
  trailerInner = trailerInner
    .replace(/\/Encrypt\s+\d+\s+\d+\s+R/g, "")
    .replace(/\/ID\s*\[.*?\]/gs, "");
  const newTrailer = `<< ${trailerInner.trim()} /Encrypt ${encObjNum} 0 R /ID [<${toHex(
    fileId,
  )}> <${toHex(fileId)}>] >>`;

  const encObjBytes = enc.encode(encObjStr);
  const newXrefOffset = encPdf.length + encObjBytes.length;
  const xrefEntry = `${String(encObjOffset).padStart(10, "0")} 00000 n \n`;
  const newXref = enc.encode(
    `\nxref\n${encObjNum} 1\n${xrefEntry}trailer\n${newTrailer}\nstartxref\n${newXrefOffset}\n%%EOF\n`,
  );

  const final = new Uint8Array(
    encPdf.length + encObjBytes.length + newXref.length,
  );
  final.set(encPdf);
  final.set(encObjBytes, encPdf.length);
  final.set(newXref, encPdf.length + encObjBytes.length);
  return final;
}

// ---------------------------------------------------------------------------
// buildSearchablePdf — embed OCR text layer over scanned page images
// ---------------------------------------------------------------------------

export async function buildSearchablePdf(
  pages: SearchablePdfPage[],
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const sorted = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];

    // Decode JPEG data URL and embed as image
    const base64 = p.imageDataUrl.split(",")[1];
    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const jpegImage = await pdfDoc.embedJpg(imgBytes);

    // Use 72 DPI so 1px = 1pt
    const pageWidth = p.imageWidth;
    const pageHeight = p.imageHeight;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Draw JPEG as full-page visual layer
    page.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });

    // Draw invisible text layer for each OCR word
    for (const word of p.words) {
      const pdfX = (word.bbox.x0 / p.imageWidth) * pageWidth;
      const pdfY = (1 - word.bbox.y1 / p.imageHeight) * pageHeight;
      const fontSize = Math.max(
        6,
        Math.round(
          ((word.bbox.y1 - word.bbox.y0) / p.imageHeight) * pageHeight,
        ),
      );

      // Replace non-latin1 characters with space (pdf-lib standard fonts are latin-1 only)
      const safeText = word.text.replace(/[^\x20-\xFF]/g, " ").trim();
      if (!safeText) continue;

      try {
        page.drawText(safeText, {
          x: pdfX,
          y: pdfY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: 0.001,
        });
      } catch {
        // Skip words that can't be encoded
      }
    }

    onProgress(
      Math.round(((i + 1) / sorted.length) * 100),
      `Assembling page ${i + 1} of ${sorted.length}…`,
    );
  }

  return pdfDoc.save();
}
