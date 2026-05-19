// Feature: aurora-2-ux-improvements, Property 1: OCR coordinate transform is invertible

import { describe, it } from "vitest";
import * as fc from "fast-check";

/**
 * Validates: Requirements 17.5
 *
 * The coordinate transform from canvas pixels to PDF points must be invertible.
 * Forward:  pdfX = (x0 / imageWidth) * pageWidth
 *           pdfY = (1 - y1 / imageHeight) * pageHeight
 * Inverse:  x0   = (pdfX / pageWidth) * imageWidth
 *           y1   = (1 - pdfY / pageHeight) * imageHeight
 */

// Pure forward transform
function toPdfCoords(
  x0: number,
  y1: number,
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
): { pdfX: number; pdfY: number } {
  return {
    pdfX: (x0 / imageWidth) * pageWidth,
    pdfY: (1 - y1 / imageHeight) * pageHeight,
  };
}

// Pure inverse transform
function toCanvasCoords(
  pdfX: number,
  pdfY: number,
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
): { x0: number; y1: number } {
  return {
    x0: (pdfX / pageWidth) * imageWidth,
    y1: (1 - pdfY / pageHeight) * imageHeight,
  };
}

const EPSILON = 1e-6;

// Arbitrary for positive dimensions (1 to 10000)
const positiveDim = fc.float({ min: 1, max: 10000, noNaN: true });

describe("Property 1: OCR coordinate transform is invertible", () => {
  it("forward then inverse gives back original coordinates (within floating point tolerance)", () => {
    fc.assert(
      fc.property(
        positiveDim, // imageWidth
        positiveDim, // imageHeight
        positiveDim, // pageWidth
        positiveDim, // pageHeight
        fc.float({ min: 0, max: 1, noNaN: true }), // x0 fraction of imageWidth
        fc.float({ min: 0, max: 1, noNaN: true }), // y1 fraction of imageHeight
        (imageWidth, imageHeight, pageWidth, pageHeight, x0Frac, y1Frac) => {
          const x0 = x0Frac * imageWidth;
          const y1 = y1Frac * imageHeight;

          const { pdfX, pdfY } = toPdfCoords(
            x0,
            y1,
            imageWidth,
            imageHeight,
            pageWidth,
            pageHeight,
          );
          const { x0: recoveredX0, y1: recoveredY1 } = toCanvasCoords(
            pdfX,
            pdfY,
            imageWidth,
            imageHeight,
            pageWidth,
            pageHeight,
          );

          return (
            Math.abs(recoveredX0 - x0) < EPSILON &&
            Math.abs(recoveredY1 - y1) < EPSILON
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pdfX is always in [0, pageWidth]", () => {
    fc.assert(
      fc.property(
        positiveDim, // imageWidth
        positiveDim, // imageHeight
        positiveDim, // pageWidth
        positiveDim, // pageHeight
        fc.float({ min: 0, max: 1, noNaN: true }), // x0 fraction of imageWidth
        (imageWidth, imageHeight, pageWidth, pageHeight, x0Frac) => {
          const x0 = x0Frac * imageWidth;

          const { pdfX } = toPdfCoords(
            x0,
            0,
            imageWidth,
            imageHeight,
            pageWidth,
            pageHeight,
          );

          return pdfX >= -EPSILON && pdfX <= pageWidth + EPSILON;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pdfY is always in [0, pageHeight]", () => {
    fc.assert(
      fc.property(
        positiveDim, // imageWidth
        positiveDim, // imageHeight
        positiveDim, // pageWidth
        positiveDim, // pageHeight
        fc.float({ min: 0, max: 1, noNaN: true }), // y1 fraction of imageHeight
        (imageWidth, imageHeight, pageWidth, pageHeight, y1Frac) => {
          const y1 = y1Frac * imageHeight;

          const { pdfY } = toPdfCoords(
            0,
            y1,
            imageWidth,
            imageHeight,
            pageWidth,
            pageHeight,
          );

          return pdfY >= -EPSILON && pdfY <= pageHeight + EPSILON;
        },
      ),
      { numRuns: 100 },
    );
  });
});
