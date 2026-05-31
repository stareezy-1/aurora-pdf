// Feature: aurora-pdf-feature-parity, Property 2: CoordinateMapper touch/mouse equivalence

import { describe, it, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  mapOverlayToPdf,
  type OverlayRect,
  type PageDimensions,
} from "../../src/lib/coordinate-mapper";

/**
 * Validates: Requirements 0.3, 0.4
 *
 * Property 2: CoordinateMapper touch/mouse equivalence
 *
 * Both touch and mouse events produce the same OverlayRect input to the mapper
 * (callers extract clientX/Y from either event type and subtract the container's
 * getBoundingClientRect() origin). Therefore, for any given visual position on
 * the canvas, mapOverlayToPdf MUST return identical PDF coordinates regardless
 * of whether the position originated from a mouse or touch event.
 *
 * This property verifies that the mapper is purely a function of its inputs —
 * it has no event-type awareness — so identical OverlayRect values always
 * produce identical PdfRect values.
 */

/** Create a minimal HTMLImageElement stub with controlled natural dimensions. */
function makeImageEl(
  naturalWidth: number,
  naturalHeight: number,
): HTMLImageElement {
  const el = document.createElement("img");
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

function setDpr(dpr: number) {
  Object.defineProperty(window, "devicePixelRatio", {
    get: () => dpr,
    configurable: true,
  });
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

const posFloat = (min: number, max: number) =>
  fc.float({ min: Math.fround(min), max: Math.fround(max), noNaN: true });

const pageDimArb: fc.Arbitrary<PageDimensions> = fc.oneof(
  fc.constant({ width: 595, height: 842 }), // A4
  fc.constant({ width: 612, height: 792 }), // Letter
  fc
    .tuple(posFloat(100, 1200), posFloat(100, 1600))
    .map(([w, h]) => ({ width: w, height: h })),
);

const zoomArb = fc.oneof(
  fc.constant(0.5),
  fc.constant(1.0),
  fc.constant(1.5),
  posFloat(0.1, 3.0),
);

const dprArb = fc.oneof(fc.constant(1), fc.constant(2), fc.constant(3));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Property 2: CoordinateMapper touch/mouse equivalence", () => {
  let originalDpr: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalDpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  });

  afterEach(() => {
    if (originalDpr) {
      Object.defineProperty(window, "devicePixelRatio", originalDpr);
    }
  });

  it("identical OverlayRect inputs always produce identical PdfRect outputs", () => {
    /**
     * Simulates the caller normalisation described in the design doc:
     *   MouseEvent:  overlayX = e.clientX - rect.left,  overlayY = e.clientY - rect.top
     *   TouchEvent:  overlayX = t.clientX - rect.left,  overlayY = t.clientY - rect.top
     *
     * When both events originate from the same visual position, they produce
     * the same (overlayX, overlayY) — and therefore the same OverlayRect.
     * The mapper must return the same PdfRect for both.
     */
    fc.assert(
      fc.property(
        pageDimArb,
        zoomArb,
        dprArb,
        posFloat(100, 4000), // naturalWidth
        posFloat(100, 4000), // naturalHeight
        posFloat(0, 1), // x fraction of logical canvas width
        posFloat(0, 1), // y fraction of logical canvas height
        posFloat(0.01, 0.5), // width fraction
        posFloat(0.01, 0.5), // height fraction
        (pageDimensions, zoom, dpr, natW, natH, xFrac, yFrac, wFrac, hFrac) => {
          setDpr(dpr);
          const containerEl = makeImageEl(natW, natH);

          const logicalW = (natW / dpr) * zoom;
          const logicalH = (natH / dpr) * zoom;

          // Clamp so the overlay stays within the canvas
          const w = Math.min(wFrac * logicalW, logicalW * 0.9);
          const h = Math.min(hFrac * logicalH, logicalH * 0.9);
          const x = Math.min(xFrac * logicalW, logicalW - w);
          const y = Math.min(yFrac * logicalH, logicalH - h);

          // "Mouse-derived" overlay (from MouseEvent clientX/Y - rect origin)
          const mouseOverlay: OverlayRect = { x, y, width: w, height: h };

          // "Touch-derived" overlay — same visual position, same values
          const touchOverlay: OverlayRect = { x, y, width: w, height: h };

          const opts = { pageIndex: 0, zoom, containerEl, pageDimensions };

          const mouseResult = mapOverlayToPdf({
            overlay: mouseOverlay,
            ...opts,
          });
          const touchResult = mapOverlayToPdf({
            overlay: touchOverlay,
            ...opts,
          });

          // Results must be exactly equal (same inputs → same pure function output)
          return (
            mouseResult.x === touchResult.x &&
            mouseResult.y === touchResult.y &&
            mouseResult.width === touchResult.width &&
            mouseResult.height === touchResult.height
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("different visual positions produce different PDF coordinates", () => {
    /**
     * Verifies the mapper is injective: two distinct overlay positions
     * must map to distinct PDF positions (no coordinate collapse).
     */
    fc.assert(
      fc.property(
        pageDimArb,
        zoomArb,
        dprArb,
        posFloat(200, 4000),
        posFloat(200, 4000),
        (pageDimensions, zoom, dpr, natW, natH) => {
          setDpr(dpr);
          const containerEl = makeImageEl(natW, natH);

          const logicalW = (natW / dpr) * zoom;
          const logicalH = (natH / dpr) * zoom;

          // Two clearly distinct positions (separated by at least 10% of canvas)
          const overlayA: OverlayRect = {
            x: logicalW * 0.1,
            y: logicalH * 0.1,
            width: logicalW * 0.2,
            height: logicalH * 0.2,
          };
          const overlayB: OverlayRect = {
            x: logicalW * 0.5,
            y: logicalH * 0.5,
            width: logicalW * 0.2,
            height: logicalH * 0.2,
          };

          const opts = { pageIndex: 0, zoom, containerEl, pageDimensions };
          const resultA = mapOverlayToPdf({ overlay: overlayA, ...opts });
          const resultB = mapOverlayToPdf({ overlay: overlayB, ...opts });

          // Different canvas positions must produce different PDF positions
          return resultA.x !== resultB.x || resultA.y !== resultB.y;
        },
      ),
      { numRuns: 200 },
    );
  });

  it("zoom change does not affect PDF coordinates for the same logical position", () => {
    /**
     * Verifies Requirement 0.9: when zoom changes, the PDF coordinates for a
     * given logical page position remain constant. The overlay CSS pixel values
     * scale with zoom, but the resulting PDF points must be the same.
     *
     * If an overlay covers 20% of the logical page width at zoom 1.0,
     * it should cover the same 20% at zoom 2.0 — the CSS pixel values double,
     * but the PDF point values stay the same.
     */
    fc.assert(
      fc.property(
        pageDimArb,
        dprArb,
        posFloat(200, 4000),
        posFloat(200, 4000),
        posFloat(0.05, 0.7), // x fraction of page
        posFloat(0.05, 0.7), // y fraction of page
        posFloat(0.05, 0.3), // width fraction of page
        posFloat(0.05, 0.3), // height fraction of page
        (pageDimensions, dpr, natW, natH, xFrac, yFrac, wFrac, hFrac) => {
          setDpr(dpr);
          const containerEl = makeImageEl(natW, natH);

          const logicalW = natW / dpr; // logical canvas width at zoom 1.0
          const logicalH = natH / dpr;

          // Compute the overlay in CSS pixels at zoom 1.0 and zoom 2.0.
          // The overlay represents the same logical page region in both cases.
          const zoom1 = 1.0;
          const zoom2 = 2.0;

          // At zoom Z, the canvas is logicalW*Z × logicalH*Z CSS pixels.
          // A position at (xFrac, yFrac) of the page maps to:
          //   cssX = xFrac * logicalW * zoom
          //   cssY = yFrac * logicalH * zoom  (top-down)
          // But the overlay.y is measured from the top of the canvas, and
          // the overlay represents the top-left corner of the region.
          // The bottom of the overlay in canvas space = (yFrac + hFrac) * logicalH * zoom
          // which is what the mapper uses for Y-axis inversion.

          const overlayAt = (zoom: number): OverlayRect => ({
            x: xFrac * logicalW * zoom,
            y: yFrac * logicalH * zoom,
            width: wFrac * logicalW * zoom,
            height: hFrac * logicalH * zoom,
          });

          const opts = { pageIndex: 0, containerEl, pageDimensions };

          const pdf1 = mapOverlayToPdf({
            overlay: overlayAt(zoom1),
            zoom: zoom1,
            ...opts,
          });
          const pdf2 = mapOverlayToPdf({
            overlay: overlayAt(zoom2),
            zoom: zoom2,
            ...opts,
          });

          const EPSILON = 1e-4;
          return (
            Math.abs(pdf1.x - pdf2.x) < EPSILON &&
            Math.abs(pdf1.y - pdf2.y) < EPSILON &&
            Math.abs(pdf1.width - pdf2.width) < EPSILON &&
            Math.abs(pdf1.height - pdf2.height) < EPSILON
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
