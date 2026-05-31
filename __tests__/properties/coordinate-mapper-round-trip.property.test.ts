// Feature: aurora-pdf-feature-parity, Property 1: CoordinateMapper round-trip invariant

import { describe, it, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  mapOverlayToPdf,
  mapPdfToOverlay,
  type OverlayRect,
  type PageDimensions,
} from "../../src/lib/coordinate-mapper";

/**
 * Validates: Requirements 0.7, 0.10
 *
 * Property 1: CoordinateMapper round-trip invariant
 *
 * For any overlay rect, page dimensions, zoom, and DPR:
 *   mapPdfToOverlay(mapOverlayToPdf(overlay)) ≈ overlay
 *
 * This guarantees that placing an overlay at canvas position (cx, cy) at zoom Z,
 * exporting to PDF, then re-rendering at zoom Z will display the overlay within
 * floating-point tolerance of (cx, cy).
 *
 * Tested for A4 (595×842 pt), Letter (612×792 pt), and custom page sizes,
 * at zoom levels 0.5, 1.0, and 1.5 (50%, 100%, 150%).
 */

// Tolerance: 2 CSS pixels as required by Req 0.7
const PIXEL_TOLERANCE = 2;

/** Create a minimal HTMLImageElement stub with controlled natural dimensions. */
function makeImageEl(
  naturalWidth: number,
  naturalHeight: number,
): HTMLImageElement {
  const el = document.createElement("img");
  // jsdom doesn't load images, so naturalWidth/naturalHeight stay 0 unless we
  // define them directly on the instance.
  Object.defineProperty(el, "naturalWidth", {
    get: () => naturalWidth,
    configurable: true,
  });
  Object.defineProperty(el, "naturalHeight", {
    get: () => naturalHeight,
    configurable: true,
  });
  return el;
}

/** Override window.devicePixelRatio for the duration of a test. */
function setDpr(dpr: number) {
  Object.defineProperty(window, "devicePixelRatio", {
    get: () => dpr,
    configurable: true,
  });
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Positive float in [min, max] — bounds must be 32-bit floats for fc.float */
const posFloat = (min: number, max: number) =>
  fc.float({ min: Math.fround(min), max: Math.fround(max), noNaN: true });

/** Known page sizes: A4, Letter, and a custom size */
const pageDimArb: fc.Arbitrary<PageDimensions> = fc.oneof(
  fc.constant({ width: 595, height: 842 }), // A4
  fc.constant({ width: 612, height: 792 }), // Letter
  // Custom: width 100–1200 pt, height 100–1600 pt
  fc
    .tuple(posFloat(100, 1200), posFloat(100, 1600))
    .map(([w, h]) => ({ width: w, height: h })),
);

/** Zoom levels: 50%, 100%, 150% (plus arbitrary values in [0.1, 3.0]) */
const zoomArb: fc.Arbitrary<number> = fc.oneof(
  fc.constant(0.5),
  fc.constant(1.0),
  fc.constant(1.5),
  posFloat(0.1, 3.0),
);

/** DPR values: 1, 2, 3 (common device values) */
const dprArb: fc.Arbitrary<number> = fc.oneof(
  fc.constant(1),
  fc.constant(2),
  fc.constant(3),
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 1: CoordinateMapper round-trip invariant", () => {
  let originalDpr: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalDpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  });

  afterEach(() => {
    if (originalDpr) {
      Object.defineProperty(window, "devicePixelRatio", originalDpr);
    }
  });

  it("mapPdfToOverlay(mapOverlayToPdf(overlay)) ≈ overlay within 2 CSS pixels", () => {
    fc.assert(
      fc.property(
        pageDimArb,
        zoomArb,
        dprArb,
        // naturalWidth/Height: physical pixels (logical * dpr), range 100–4000
        posFloat(100, 4000),
        posFloat(100, 4000),
        (pageDimensions, zoom, dpr, natW, natH) => {
          setDpr(dpr);
          const containerEl = makeImageEl(natW, natH);

          // Generate an overlay that fits within the canvas at this zoom/dpr
          const logicalW = (natW / dpr) * zoom;
          const logicalH = (natH / dpr) * zoom;

          // Use a fixed overlay fraction to keep the test deterministic per run
          // (fast-check drives the outer parameters; inner overlay is derived)
          const overlay: OverlayRect = {
            x: logicalW * 0.1,
            y: logicalH * 0.1,
            width: logicalW * 0.3,
            height: logicalH * 0.3,
          };

          const pdfRect = mapOverlayToPdf({
            overlay,
            pageIndex: 0,
            zoom,
            containerEl,
            pageDimensions,
          });

          const recovered = mapPdfToOverlay(
            pdfRect,
            0,
            zoom,
            containerEl,
            pageDimensions,
          );

          return (
            Math.abs(recovered.x - overlay.x) < PIXEL_TOLERANCE &&
            Math.abs(recovered.y - overlay.y) < PIXEL_TOLERANCE &&
            Math.abs(recovered.width - overlay.width) < PIXEL_TOLERANCE &&
            Math.abs(recovered.height - overlay.height) < PIXEL_TOLERANCE
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it("round-trip holds for A4 at 50%, 100%, 150% zoom", () => {
    const a4: PageDimensions = { width: 595, height: 842 };
    const zooms = [0.5, 1.0, 1.5];

    for (const zoom of zooms) {
      fc.assert(
        fc.property(
          dprArb,
          posFloat(200, 3000),
          posFloat(200, 3000),
          (dpr, natW, natH) => {
            setDpr(dpr);
            const containerEl = makeImageEl(natW, natH);
            const logicalW = (natW / dpr) * zoom;
            const logicalH = (natH / dpr) * zoom;

            const overlay: OverlayRect = {
              x: logicalW * 0.2,
              y: logicalH * 0.2,
              width: logicalW * 0.4,
              height: logicalH * 0.4,
            };

            const pdfRect = mapOverlayToPdf({
              overlay,
              pageIndex: 0,
              zoom,
              containerEl,
              pageDimensions: a4,
            });

            const recovered = mapPdfToOverlay(
              pdfRect,
              0,
              zoom,
              containerEl,
              a4,
            );

            return (
              Math.abs(recovered.x - overlay.x) < PIXEL_TOLERANCE &&
              Math.abs(recovered.y - overlay.y) < PIXEL_TOLERANCE &&
              Math.abs(recovered.width - overlay.width) < PIXEL_TOLERANCE &&
              Math.abs(recovered.height - overlay.height) < PIXEL_TOLERANCE
            );
          },
        ),
        { numRuns: 100 },
      );
    }
  });

  it("round-trip holds for Letter at 50%, 100%, 150% zoom", () => {
    const letter: PageDimensions = { width: 612, height: 792 };
    const zooms = [0.5, 1.0, 1.5];

    for (const zoom of zooms) {
      fc.assert(
        fc.property(
          dprArb,
          posFloat(200, 3000),
          posFloat(200, 3000),
          (dpr, natW, natH) => {
            setDpr(dpr);
            const containerEl = makeImageEl(natW, natH);
            const logicalW = (natW / dpr) * zoom;
            const logicalH = (natH / dpr) * zoom;

            const overlay: OverlayRect = {
              x: logicalW * 0.15,
              y: logicalH * 0.15,
              width: logicalW * 0.35,
              height: logicalH * 0.35,
            };

            const pdfRect = mapOverlayToPdf({
              overlay,
              pageIndex: 0,
              zoom,
              containerEl,
              pageDimensions: letter,
            });

            const recovered = mapPdfToOverlay(
              pdfRect,
              0,
              zoom,
              containerEl,
              letter,
            );

            return (
              Math.abs(recovered.x - overlay.x) < PIXEL_TOLERANCE &&
              Math.abs(recovered.y - overlay.y) < PIXEL_TOLERANCE &&
              Math.abs(recovered.width - overlay.width) < PIXEL_TOLERANCE &&
              Math.abs(recovered.height - overlay.height) < PIXEL_TOLERANCE
            );
          },
        ),
        { numRuns: 100 },
      );
    }
  });

  it("round-trip holds for custom (landscape) page size at 50%, 100%, 150% zoom", () => {
    // Landscape A4: 842×595
    const landscape: PageDimensions = { width: 842, height: 595 };
    const zooms = [0.5, 1.0, 1.5];

    for (const zoom of zooms) {
      fc.assert(
        fc.property(
          dprArb,
          posFloat(200, 3000),
          posFloat(200, 3000),
          (dpr, natW, natH) => {
            setDpr(dpr);
            const containerEl = makeImageEl(natW, natH);
            const logicalW = (natW / dpr) * zoom;
            const logicalH = (natH / dpr) * zoom;

            const overlay: OverlayRect = {
              x: logicalW * 0.05,
              y: logicalH * 0.05,
              width: logicalW * 0.25,
              height: logicalH * 0.25,
            };

            const pdfRect = mapOverlayToPdf({
              overlay,
              pageIndex: 0,
              zoom,
              containerEl,
              pageDimensions: landscape,
            });

            const recovered = mapPdfToOverlay(
              pdfRect,
              0,
              zoom,
              containerEl,
              landscape,
            );

            return (
              Math.abs(recovered.x - overlay.x) < PIXEL_TOLERANCE &&
              Math.abs(recovered.y - overlay.y) < PIXEL_TOLERANCE &&
              Math.abs(recovered.width - overlay.width) < PIXEL_TOLERANCE &&
              Math.abs(recovered.height - overlay.height) < PIXEL_TOLERANCE
            );
          },
        ),
        { numRuns: 100 },
      );
    }
  });

  it("pdfX is always in [0, pageDimensions.width]", () => {
    fc.assert(
      fc.property(
        pageDimArb,
        zoomArb,
        dprArb,
        posFloat(100, 4000),
        posFloat(100, 4000),
        (pageDimensions, zoom, dpr, natW, natH) => {
          setDpr(dpr);
          const containerEl = makeImageEl(natW, natH);
          const logicalW = (natW / dpr) * zoom;
          const logicalH = (natH / dpr) * zoom;

          const overlay: OverlayRect = {
            x: logicalW * 0.1,
            y: logicalH * 0.1,
            width: logicalW * 0.3,
            height: logicalH * 0.3,
          };

          const { x } = mapOverlayToPdf({
            overlay,
            pageIndex: 0,
            zoom,
            containerEl,
            pageDimensions,
          });

          return x >= -1e-6 && x <= pageDimensions.width + 1e-6;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("pdfY is always in [0, pageDimensions.height]", () => {
    fc.assert(
      fc.property(
        pageDimArb,
        zoomArb,
        dprArb,
        posFloat(100, 4000),
        posFloat(100, 4000),
        (pageDimensions, zoom, dpr, natW, natH) => {
          setDpr(dpr);
          const containerEl = makeImageEl(natW, natH);
          const logicalW = (natW / dpr) * zoom;
          const logicalH = (natH / dpr) * zoom;

          const overlay: OverlayRect = {
            x: logicalW * 0.1,
            y: logicalH * 0.1,
            width: logicalW * 0.3,
            height: logicalH * 0.3,
          };

          const { y } = mapOverlayToPdf({
            overlay,
            pageIndex: 0,
            zoom,
            containerEl,
            pageDimensions,
          });

          return y >= -1e-6 && y <= pageDimensions.height + 1e-6;
        },
      ),
      { numRuns: 200 },
    );
  });
});
