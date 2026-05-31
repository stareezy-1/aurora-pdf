/**
 * Watermark Engine — client-side module for applying text and image watermarks
 * to PDFs.
 *
 * Supports:
 * - Text watermarks: custom text, font, size, color, opacity, rotation
 * - Image watermarks: PNG/JPEG/SVG (max 5 MB), opacity, rotation
 * - Positioning modes: center, top-left, top-right, bottom-left, bottom-right, custom (X/Y %)
 * - Tile mode: repeat watermark in a grid pattern across the page
 * - Page targeting: all, first, last, odd, even, custom range
 * - Layer control: foreground (above content) or background (below content)
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */

import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import type { WatermarkConfig } from "@/types/tool.types";
import type { ProgressCallback } from "@/types/engine.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum image watermark file size in bytes (5 MB). Requirement 5.10 */
export const MAX_IMAGE_WATERMARK_BYTES = 5 * 1024 * 1024;

/** Margin from page edge for non-center placements (in PDF points). */
const EDGE_MARGIN = 40;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
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

/**
 * Map a WatermarkPlacement to PDF coordinates (center of the watermark element).
 * Returns { x, y } in PDF points (bottom-left origin).
 *
 * Requirements: 5.4
 */
function resolvePlacementCenter(
  placement: WatermarkConfig["placement"],
  pageWidth: number,
  pageHeight: number,
  wmWidth: number,
  wmHeight: number,
  customX?: number,
  customY?: number,
): { x: number; y: number } {
  switch (placement) {
    case "center":
      return { x: pageWidth / 2, y: pageHeight / 2 };
    case "top-left":
      return {
        x: EDGE_MARGIN + wmWidth / 2,
        y: pageHeight - EDGE_MARGIN - wmHeight / 2,
      };
    case "top-right":
      return {
        x: pageWidth - EDGE_MARGIN - wmWidth / 2,
        y: pageHeight - EDGE_MARGIN - wmHeight / 2,
      };
    case "bottom-left":
      return {
        x: EDGE_MARGIN + wmWidth / 2,
        y: EDGE_MARGIN + wmHeight / 2,
      };
    case "bottom-right":
      return {
        x: pageWidth - EDGE_MARGIN - wmWidth / 2,
        y: EDGE_MARGIN + wmHeight / 2,
      };
    case "custom": {
      const cx = ((customX ?? 50) / 100) * pageWidth;
      const cy = ((100 - (customY ?? 50)) / 100) * pageHeight;
      return { x: cx, y: cy };
    }
    default:
      return { x: pageWidth / 2, y: pageHeight / 2 };
  }
}

/**
 * Parse a page range string into a set of 0-based page indices.
 * Supports: '' (all), 'first', 'last', 'odd', 'even', '1-3,5,7-9'
 *
 * Requirements: 5.6
 */
export function resolvePageIndices(
  pageRange: string,
  totalPages: number,
): number[] {
  const trimmed = pageRange.trim().toLowerCase();

  if (!trimmed || trimmed === "all") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  if (trimmed === "first") return [0];
  if (trimmed === "last") return [totalPages - 1];
  if (trimmed === "odd") {
    return Array.from({ length: totalPages }, (_, i) => i).filter(
      (i) => i % 2 === 0, // 0-based: page 1 = index 0 = odd
    );
  }
  if (trimmed === "even") {
    return Array.from({ length: totalPages }, (_, i) => i).filter(
      (i) => i % 2 === 1,
    );
  }

  // Custom range expression: "1-3,5,7-9" (1-based page numbers)
  const indices = new Set<number>();
  const parts = trimmed.split(",");
  for (const part of parts) {
    const rangePart = part.trim();
    if (!rangePart) continue;
    const dashIdx = rangePart.indexOf("-");
    if (dashIdx > 0) {
      const start = parseInt(rangePart.slice(0, dashIdx), 10);
      const end = parseInt(rangePart.slice(dashIdx + 1), 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = start; p <= end; p++) {
          const idx = p - 1;
          if (idx >= 0 && idx < totalPages) indices.add(idx);
        }
      }
    } else {
      const p = parseInt(rangePart, 10);
      if (!isNaN(p)) {
        const idx = p - 1;
        if (idx >= 0 && idx < totalPages) indices.add(idx);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Resolve the standard font closest to the requested font family.
 */
function resolveStandardFont(
  fontFamily?: string,
): (typeof StandardFonts)[keyof typeof StandardFonts] {
  const lower = (fontFamily ?? "").toLowerCase();
  if (
    lower.includes("times") ||
    lower.includes("georgia") ||
    lower.includes("palatino") ||
    lower.includes("garamond") ||
    lower.includes("bookman")
  )
    return StandardFonts.TimesRomanBold;
  if (lower.includes("courier") || lower.includes("monospace"))
    return StandardFonts.CourierBold;
  return StandardFonts.HelveticaBold;
}

// ---------------------------------------------------------------------------
// Core watermark drawing helpers
// ---------------------------------------------------------------------------

interface DrawTextWatermarkOpts {
  page: ReturnType<PDFDocument["getPages"]>[number];
  text: string;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontSize: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  rotation: number;
  centerX: number;
  centerY: number;
}

function drawTextWatermark(opts: DrawTextWatermarkOpts): void {
  const {
    page,
    text,
    font,
    fontSize,
    color,
    opacity,
    rotation,
    centerX,
    centerY,
  } = opts;

  let textWidth = 0;
  try {
    textWidth = font.widthOfTextAtSize(text, fontSize);
  } catch {
    textWidth = text.length * fontSize * 0.5;
  }

  // Draw text centered at (centerX, centerY)
  page.drawText(text, {
    x: centerX - textWidth / 2,
    y: centerY - fontSize / 2,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
    opacity,
    rotate: degrees(rotation),
  });
}

interface DrawImageWatermarkOpts {
  page: ReturnType<PDFDocument["getPages"]>[number];
  image: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  wmWidth: number;
  wmHeight: number;
  opacity: number;
  rotation: number;
  centerX: number;
  centerY: number;
}

function drawImageWatermark(opts: DrawImageWatermarkOpts): void {
  const {
    page,
    image,
    wmWidth,
    wmHeight,
    opacity,
    rotation,
    centerX,
    centerY,
  } = opts;

  page.drawImage(image, {
    x: centerX - wmWidth / 2,
    y: centerY - wmHeight / 2,
    width: wmWidth,
    height: wmHeight,
    opacity,
    rotate: degrees(rotation),
  });
}

// ---------------------------------------------------------------------------
// Tile mode helpers
// ---------------------------------------------------------------------------

/**
 * Compute tile positions for a watermark element of given dimensions.
 * Returns an array of { x, y } center positions covering the page.
 *
 * Requirements: 5.5
 */
function computeTilePositions(
  pageWidth: number,
  pageHeight: number,
  wmWidth: number,
  wmHeight: number,
): Array<{ x: number; y: number }> {
  const gapX = wmWidth * 0.5;
  const gapY = wmHeight * 0.5;
  const stepX = wmWidth + gapX;
  const stepY = wmHeight + gapY;

  const positions: Array<{ x: number; y: number }> = [];

  // Start slightly before the page edge to ensure full coverage
  const startX = wmWidth / 2;
  const startY = wmHeight / 2;

  for (let y = startY; y < pageHeight + wmHeight; y += stepY) {
    for (let x = startX; x < pageWidth + wmWidth; x += stepX) {
      positions.push({ x, y });
    }
  }

  return positions;
}

// ---------------------------------------------------------------------------
// Background layer helper
// ---------------------------------------------------------------------------

/**
 * For background layer: we need to draw the watermark BEHIND the existing
 * page content. pdf-lib doesn't natively support inserting content before
 * existing streams, so we use a workaround:
 * 1. Create a new blank page with the same dimensions
 * 2. Draw the watermark on it
 * 3. Copy the original page content on top
 *
 * In practice, pdf-lib's `pushGraphicsState` / `popGraphicsState` operators
 * can be prepended to the content stream. We use the lower-level approach
 * of prepending operators to the page's content stream.
 *
 * Requirements: 5.7
 */
async function applyBackgroundWatermarkToPage(
  pdfDoc: PDFDocument,
  pageIndex: number,
  drawFn: (page: ReturnType<PDFDocument["getPages"]>[number]) => void,
): Promise<void> {
  const pages = pdfDoc.getPages();
  const originalPage = pages[pageIndex];
  const { width, height } = originalPage.getSize();

  // Create a temporary page, draw the watermark on it, then merge
  // We use the approach of creating a new page, drawing watermark,
  // then embedding the original page as an XObject on top.
  // Since pdf-lib doesn't expose low-level stream prepending easily,
  // we use a practical approach: draw on a new page, then copy original
  // content by embedding it as a form XObject.

  // Practical approach: use pushGraphicsState to save state, draw watermark,
  // then restore. The watermark will appear at the bottom of the content stack
  // by prepending to the content stream.

  // We'll use the page's content stream manipulation approach:
  // Get the existing content stream, prepend our watermark drawing operators.

  // For simplicity and reliability, we draw the watermark with very low
  // z-order by using a separate approach: create a new page, draw watermark,
  // then copy original page content on top via embedPage.

  const tempDoc = await PDFDocument.create();
  const tempPage = tempDoc.addPage([width, height]);

  // Draw watermark on temp page
  drawFn(tempPage);

  // Embed the temp page as a form XObject in the main doc
  const [embeddedWatermark] = await pdfDoc.embedPages([tempPage]);

  // Create a new page in the main doc with watermark as background
  const newPage = pdfDoc.insertPage(pageIndex, [width, height]);

  // Draw watermark background first
  newPage.drawPage(embeddedWatermark, {
    x: 0,
    y: 0,
    width,
    height,
  });

  // Now embed the original page content on top
  const [embeddedOriginal] = await pdfDoc.embedPages([originalPage]);
  newPage.drawPage(embeddedOriginal, {
    x: 0,
    y: 0,
    width,
    height,
  });

  // Remove the original page (it's now at pageIndex + 1 due to the insert)
  pdfDoc.removePage(pageIndex + 1);
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

/**
 * Apply a watermark to a PDF according to the provided configuration.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11
 */
export async function applyWatermark(
  bytes: Uint8Array,
  config: WatermarkConfig,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(5, "Loading PDF…");

  const pdfDoc = await PDFDocument.load(copyBytes(bytes));
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Resolve which pages to watermark
  const targetIndices = resolvePageIndices(config.pageRange, totalPages);

  const opacity = Math.max(0.05, Math.min(1, config.opacity / 100));

  // ── Prepare watermark assets ──────────────────────────────────────────────

  let font: Awaited<ReturnType<PDFDocument["embedFont"]>> | null = null;
  let embeddedImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  let imageAspectRatio = 1;

  if (config.type === "text") {
    const standardFont = resolveStandardFont(config.fontFamily);
    font = await pdfDoc.embedFont(standardFont);
  } else if (config.type === "image" && config.imageDataUrl) {
    const base64 = config.imageDataUrl.split(",")[1];
    if (!base64) throw new Error("Invalid image data URL.");
    const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const isSvg = config.imageDataUrl.startsWith("data:image/svg");
    const isPng = config.imageDataUrl.startsWith("data:image/png") || isSvg;

    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(imgBytes);
    }

    const dims = embeddedImage.scale(1);
    imageAspectRatio = dims.width > 0 ? dims.height / dims.width : 1;
  }

  // ── Process each target page ──────────────────────────────────────────────

  for (let i = 0; i < targetIndices.length; i++) {
    const pageIndex = targetIndices[i];
    onProgress(
      5 + Math.round(((i + 1) / targetIndices.length) * 85),
      `Watermarking page ${pageIndex + 1} of ${totalPages}…`,
    );

    const page = pdfDoc.getPages()[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Determine watermark dimensions
    let wmWidth = 0;
    let wmHeight = 0;

    if (config.type === "text" && font) {
      const fontSize = config.fontSize ?? 48;
      let textWidth = 0;
      try {
        textWidth = font.widthOfTextAtSize(
          config.text ?? "WATERMARK",
          fontSize,
        );
      } catch {
        textWidth = (config.text ?? "WATERMARK").length * fontSize * 0.5;
      }
      wmWidth = textWidth;
      wmHeight = fontSize;
    } else if (config.type === "image" && embeddedImage) {
      // Default image watermark size: 30% of page width
      wmWidth = pageWidth * 0.3;
      wmHeight = wmWidth * imageAspectRatio;
    }

    // Build the draw function for this page
    const drawOnPage = (targetPage: typeof page) => {
      if (config.tile) {
        // Tile mode: repeat across the page
        const positions = computeTilePositions(
          pageWidth,
          pageHeight,
          wmWidth,
          wmHeight,
        );
        for (const pos of positions) {
          if (config.type === "text" && font) {
            drawTextWatermark({
              page: targetPage,
              text: config.text ?? "WATERMARK",
              font,
              fontSize: config.fontSize ?? 48,
              color: hexToRgb(config.color ?? "#888888"),
              opacity,
              rotation: config.rotation,
              centerX: pos.x,
              centerY: pos.y,
            });
          } else if (config.type === "image" && embeddedImage) {
            drawImageWatermark({
              page: targetPage,
              image: embeddedImage,
              wmWidth,
              wmHeight,
              opacity,
              rotation: config.rotation,
              centerX: pos.x,
              centerY: pos.y,
            });
          }
        }
      } else {
        // Single placement
        const center = resolvePlacementCenter(
          config.placement,
          pageWidth,
          pageHeight,
          wmWidth,
          wmHeight,
          config.customX,
          config.customY,
        );

        if (config.type === "text" && font) {
          drawTextWatermark({
            page: targetPage,
            text: config.text ?? "WATERMARK",
            font,
            fontSize: config.fontSize ?? 48,
            color: hexToRgb(config.color ?? "#888888"),
            opacity,
            rotation: config.rotation,
            centerX: center.x,
            centerY: center.y,
          });
        } else if (config.type === "image" && embeddedImage) {
          drawImageWatermark({
            page: targetPage,
            image: embeddedImage,
            wmWidth,
            wmHeight,
            opacity,
            rotation: config.rotation,
            centerX: center.x,
            centerY: center.y,
          });
        }
      }
    };

    if (config.layer === "background") {
      // Background: draw watermark behind existing content
      await applyBackgroundWatermarkToPage(pdfDoc, pageIndex, drawOnPage);
    } else {
      // Foreground: draw watermark on top of existing content
      drawOnPage(page);
    }
  }

  onProgress(95, "Saving…");
  const result = await pdfDoc.save({ useObjectStreams: true });
  onProgress(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// Canvas preview helper
// ---------------------------------------------------------------------------

/**
 * Draw a watermark preview on a canvas element.
 * Used for live preview in the WatermarkPage.
 *
 * Requirements: 5.8
 */
export function drawWatermarkPreview(
  canvas: HTMLCanvasElement,
  imgSrc: string,
  config: WatermarkConfig,
): void {
  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const opacity = Math.max(0.05, Math.min(1, config.opacity / 100));

    if (config.type === "text") {
      const fontSize = config.fontSize ?? 48;
      const text = config.text ?? "WATERMARK";
      ctx.font = `bold ${fontSize}px ${
        config.fontFamily ?? "Helvetica"
      }, sans-serif`;
      ctx.fillStyle = config.color ?? "#888888";
      ctx.globalAlpha = opacity;

      const textWidth = ctx.measureText(text).width;
      const wmWidth = textWidth;
      const wmHeight = fontSize;

      if (config.tile) {
        const positions = computeTilePositions(
          canvas.width,
          canvas.height,
          wmWidth,
          wmHeight,
        );
        for (const pos of positions) {
          ctx.save();
          ctx.translate(pos.x, canvas.height - pos.y); // flip Y for canvas
          ctx.rotate((-config.rotation * Math.PI) / 180);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      } else {
        const center = resolvePlacementCenterCanvas(
          config.placement,
          canvas.width,
          canvas.height,
          wmWidth,
          wmHeight,
          config.customX,
          config.customY,
        );
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate((-config.rotation * Math.PI) / 180);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    } else if (config.type === "image" && config.imageDataUrl) {
      const wmImg = new Image();
      wmImg.onload = () => {
        const wmWidth = canvas.width * 0.3;
        const wmHeight = wmWidth * (wmImg.naturalHeight / wmImg.naturalWidth);

        ctx.globalAlpha = opacity;

        if (config.tile) {
          const positions = computeTilePositions(
            canvas.width,
            canvas.height,
            wmWidth,
            wmHeight,
          );
          for (const pos of positions) {
            ctx.save();
            ctx.translate(pos.x, canvas.height - pos.y);
            ctx.rotate((-config.rotation * Math.PI) / 180);
            ctx.drawImage(
              wmImg,
              -wmWidth / 2,
              -wmHeight / 2,
              wmWidth,
              wmHeight,
            );
            ctx.restore();
          }
        } else {
          const center = resolvePlacementCenterCanvas(
            config.placement,
            canvas.width,
            canvas.height,
            wmWidth,
            wmHeight,
            config.customX,
            config.customY,
          );
          ctx.save();
          ctx.translate(center.x, center.y);
          ctx.rotate((-config.rotation * Math.PI) / 180);
          ctx.drawImage(wmImg, -wmWidth / 2, -wmHeight / 2, wmWidth, wmHeight);
          ctx.restore();
        }
      };
      wmImg.src = config.imageDataUrl;
    }
  };
  img.src = imgSrc;
}

/**
 * Canvas-space version of resolvePlacementCenter.
 * Canvas Y-axis is top-down (0 = top), so we don't invert Y.
 */
function resolvePlacementCenterCanvas(
  placement: WatermarkConfig["placement"],
  canvasWidth: number,
  canvasHeight: number,
  wmWidth: number,
  wmHeight: number,
  customX?: number,
  customY?: number,
): { x: number; y: number } {
  switch (placement) {
    case "center":
      return { x: canvasWidth / 2, y: canvasHeight / 2 };
    case "top-left":
      return {
        x: EDGE_MARGIN + wmWidth / 2,
        y: EDGE_MARGIN + wmHeight / 2,
      };
    case "top-right":
      return {
        x: canvasWidth - EDGE_MARGIN - wmWidth / 2,
        y: EDGE_MARGIN + wmHeight / 2,
      };
    case "bottom-left":
      return {
        x: EDGE_MARGIN + wmWidth / 2,
        y: canvasHeight - EDGE_MARGIN - wmHeight / 2,
      };
    case "bottom-right":
      return {
        x: canvasWidth - EDGE_MARGIN - wmWidth / 2,
        y: canvasHeight - EDGE_MARGIN - wmHeight / 2,
      };
    case "custom": {
      const cx = ((customX ?? 50) / 100) * canvasWidth;
      const cy = ((customY ?? 50) / 100) * canvasHeight;
      return { x: cx, y: cy };
    }
    default:
      return { x: canvasWidth / 2, y: canvasHeight / 2 };
  }
}
