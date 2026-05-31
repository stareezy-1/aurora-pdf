/**
 * CoordinateMapper — single shared utility for converting canvas/DOM overlay
 * positions to PDF coordinate space and back.
 *
 * All tools that place overlays on PDF pages (sign, edit, watermark, page
 * numbers, OCR edit, header/footer, crop, form filler, form builder, redact,
 * stamps, bates numbering, digital signature appearance) MUST use this module.
 * No tool may reimplement coordinate mapping independently.
 *
 * Coordinate transform (overlay → PDF):
 *   scaleX = pageDimensions.width  / (containerEl.naturalWidth  / devicePixelRatio)
 *   scaleY = pageDimensions.height / (containerEl.naturalHeight / devicePixelRatio)
 *   pdfX   = overlay.x * scaleX / zoom
 *   pdfY   = pageDimensions.height - (overlay.y + overlay.height) * scaleY / zoom
 *
 * The Y-axis inversion converts from canvas top-down origin to PDF bottom-left
 * origin (PDF_Y_Axis).
 *
 * DevicePixelRatio: pdfjs renders page images at (scale × window.devicePixelRatio),
 * so naturalWidth already encodes the DPR. We divide by DPR to recover the
 * logical CSS pixel width before computing the scale factor.
 */

export interface OverlayRect {
  /** CSS pixels from left edge of the container element */
  x: number;
  /** CSS pixels from top edge of the container element */
  y: number;
  width: number;
  height: number;
}

export interface PdfRect {
  /** PDF points from left edge of page */
  x: number;
  /** PDF points from bottom edge of page (PDF Y-axis is bottom-up) */
  y: number;
  width: number;
  height: number;
}

export interface PageDimensions {
  /** PDF points */
  width: number;
  /** PDF points */
  height: number;
}

export interface MapOptions {
  overlay: OverlayRect;
  pageIndex: number;
  /** Current display zoom factor (1.0 = 100%) */
  zoom: number;
  /** The <img> element rendering the page preview */
  containerEl: HTMLImageElement;
  /** Actual PDF page dimensions from getPageSizes() — never hardcoded */
  pageDimensions: PageDimensions;
}

/**
 * Convert a canvas overlay rect to PDF coordinate space.
 *
 * Requirements: 0.1, 0.2, 0.3, 0.5, 0.8
 */
export function mapOverlayToPdf(opts: MapOptions): PdfRect {
  const { overlay, zoom, containerEl, pageDimensions } = opts;

  const dpr = window.devicePixelRatio || 1;

  // Logical CSS pixel dimensions of the rendered image (DPR-corrected)
  const logicalWidth = containerEl.naturalWidth / dpr;
  const logicalHeight = containerEl.naturalHeight / dpr;

  // Scale factors: PDF points per logical CSS pixel (before zoom)
  const scaleX = pageDimensions.width / logicalWidth;
  const scaleY = pageDimensions.height / logicalHeight;

  // Convert overlay position to PDF points, accounting for zoom
  const pdfX = (overlay.x * scaleX) / zoom;
  const pdfWidth = (overlay.width * scaleX) / zoom;
  const pdfHeight = (overlay.height * scaleY) / zoom;

  // Y-axis inversion: PDF origin is bottom-left; canvas origin is top-left.
  // The bottom edge of the overlay in canvas space is (overlay.y + overlay.height).
  // In PDF space, that bottom edge becomes the Y coordinate (measured from bottom).
  const pdfY =
    pageDimensions.height - ((overlay.y + overlay.height) * scaleY) / zoom;

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight };
}

/**
 * Inverse transform: convert a PDF rect back to canvas CSS pixels.
 * Used to re-anchor overlays after zoom changes (Requirement 0.9).
 *
 * Requirements: 0.7, 0.9
 */
export function mapPdfToOverlay(
  pdfRect: PdfRect,
  _pageIndex: number,
  zoom: number,
  containerEl: HTMLImageElement,
  pageDimensions: PageDimensions,
): OverlayRect {
  const dpr = window.devicePixelRatio || 1;

  const logicalWidth = containerEl.naturalWidth / dpr;
  const logicalHeight = containerEl.naturalHeight / dpr;

  const scaleX = pageDimensions.width / logicalWidth;
  const scaleY = pageDimensions.height / logicalHeight;

  // Inverse of mapOverlayToPdf:
  //   pdfX   = overlay.x * scaleX / zoom  →  overlay.x = pdfX * zoom / scaleX
  //   pdfY   = pageHeight - (overlay.y + overlay.height) * scaleY / zoom
  //          →  overlay.y + overlay.height = (pageHeight - pdfY) * zoom / scaleY
  //          →  overlay.y = (pageHeight - pdfY) * zoom / scaleY - overlay.height

  const overlayWidth = (pdfRect.width * zoom) / scaleX;
  const overlayHeight = (pdfRect.height * zoom) / scaleY;
  const overlayX = (pdfRect.x * zoom) / scaleX;
  const overlayY =
    ((pageDimensions.height - pdfRect.y) * zoom) / scaleY - overlayHeight;

  return {
    x: overlayX,
    y: overlayY,
    width: overlayWidth,
    height: overlayHeight,
  };
}

/**
 * Deferred version of mapOverlayToPdf.
 *
 * Returns a Promise that resolves once the image's naturalWidth/naturalHeight
 * are non-zero. If the image is already loaded, resolves immediately.
 * If not yet loaded, attaches a one-time 'load' listener and resolves when
 * the image fires the load event.
 *
 * NEVER falls back to hardcoded dimensions (Requirement 0.2, 0.6).
 *
 * Requirements: 0.6
 */
export function mapOverlayToPdfDeferred(
  opts: Omit<MapOptions, "containerEl"> & { containerEl: HTMLImageElement },
): Promise<PdfRect> {
  const { containerEl } = opts;

  // Image already loaded — resolve immediately
  if (containerEl.naturalWidth > 0 && containerEl.naturalHeight > 0) {
    return Promise.resolve(mapOverlayToPdf(opts as MapOptions));
  }

  // Image not yet loaded — wait for the load event (one-time listener)
  return new Promise<PdfRect>((resolve, reject) => {
    function onLoad() {
      containerEl.removeEventListener("load", onLoad);
      containerEl.removeEventListener("error", onError);

      if (containerEl.naturalWidth > 0 && containerEl.naturalHeight > 0) {
        resolve(mapOverlayToPdf(opts as MapOptions));
      } else {
        // The image fired load but still has zero dimensions — this is an
        // error condition; we must not fall back to hardcoded values.
        reject(
          new Error(
            "CoordinateMapper: image loaded but naturalWidth/naturalHeight are still zero. " +
              "Cannot compute PDF coordinates without real page dimensions.",
          ),
        );
      }
    }

    function onError() {
      containerEl.removeEventListener("load", onLoad);
      containerEl.removeEventListener("error", onError);
      reject(
        new Error(
          "CoordinateMapper: image failed to load. Cannot compute PDF coordinates.",
        ),
      );
    }

    containerEl.addEventListener("load", onLoad, { once: true });
    containerEl.addEventListener("error", onError, { once: true });
  });
}
