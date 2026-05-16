import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type {
  ProgressCallback,
  TextAnnotation,
  OcrPageResult,
} from "@/types/engine.types";
import type {
  CompressionLevel,
  WatermarkConfig,
  SignatureConfig,
  DpiOption,
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

const PLACEMENT_COORDS: Record<
  string,
  (w: number, h: number) => { x: number; y: number }
> = {
  diagonal: (w, h) => ({ x: w * 0.1, y: h * 0.4 }),
  header: (w, h) => ({ x: w * 0.1, y: h * 0.88 }),
  footer: (w, _h) => ({ x: w * 0.1, y: 30 }),
};

export async function applyWatermark(
  pdfBytes: Uint8Array,
  config: WatermarkConfig,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(copyBytes(pdfBytes));
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const { r, g, b } = hexToRgb(config.color);
  const opacity = config.opacity / 100;

  for (let i = 0; i < pages.length; i++) {
    onProgress(
      Math.round((i / pages.length) * 100),
      `Watermarking page ${i + 1} of ${pages.length}…`,
    );
    const page = pages[i];
    const { width, height } = page.getSize();
    const coords = PLACEMENT_COORDS[config.placement](width, height);
    const rotAngle = config.placement === "diagonal" ? config.rotation : 0;
    page.drawText(config.text, {
      x: coords.x,
      y: coords.y,
      size: config.fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rotAngle),
    });
  }
  onProgress(100, "Done");
  return pdfDoc.save();
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
