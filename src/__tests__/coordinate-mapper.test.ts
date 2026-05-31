// Unit tests for CoordinateMapper
// Feature: aurora-pdf-feature-parity
// Requirements: 0.7, 0.9, 0.10

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mapOverlayToPdf,
  mapPdfToOverlay,
  mapOverlayToPdfDeferred,
  type OverlayRect,
  type PageDimensions,
  type MapOptions,
} from "../lib/coordinate-mapper";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const EPSILON = 1e-6;

function approxEqual(a: number, b: number, tol = EPSILON) {
  return Math.abs(a - b) < tol;
}

// ── Page size fixtures ────────────────────────────────────────────────────────

const A4: PageDimensions = { width: 595, height: 842 };
const LETTER: PageDimensions = { width: 612, height: 792 };
const CUSTOM: PageDimensions = { width: 400, height: 600 }; // custom size

// ── Setup / teardown ──────────────────────────────────────────────────────────

let originalDpr: PropertyDescriptor | undefined;

beforeEach(() => {
  originalDpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  setDpr(1); // default to DPR 1 unless overridden per test
});

afterEach(() => {
  if (originalDpr) {
    Object.defineProperty(window, "devicePixelRatio", originalDpr);
  }
});

// ── mapOverlayToPdf ───────────────────────────────────────────────────────────

describe("mapOverlayToPdf", () => {
  describe("A4 page at 100% zoom, DPR 1", () => {
    // naturalWidth = 595 px (DPR 1, zoom 1 → logical 595 px = 595 pt)
    const containerEl = makeImageEl(595, 842);
    const pageDimensions = A4;
    const zoom = 1.0;

    it("maps top-left corner overlay to PDF top-left (high pdfY)", () => {
      const overlay: OverlayRect = { x: 0, y: 0, width: 100, height: 50 };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl,
        pageDimensions,
      });

      // pdfX = 0 * 1 / 1 = 0
      expect(approxEqual(result.x, 0)).toBe(true);
      // pdfY = 842 - (0 + 50) * 1 / 1 = 792
      expect(approxEqual(result.y, 792)).toBe(true);
      expect(approxEqual(result.width, 100)).toBe(true);
      expect(approxEqual(result.height, 50)).toBe(true);
    });

    it("maps bottom-right corner overlay to PDF bottom-right (low pdfY)", () => {
      const overlay: OverlayRect = { x: 495, y: 792, width: 100, height: 50 };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl,
        pageDimensions,
      });

      // pdfX = 495
      expect(approxEqual(result.x, 495)).toBe(true);
      // pdfY = 842 - (792 + 50) = 0
      expect(approxEqual(result.y, 0)).toBe(true);
    });

    it("maps centre overlay correctly", () => {
      // Centre of A4: x=247.5, y=371, width=100, height=100
      const overlay: OverlayRect = {
        x: 247.5,
        y: 371,
        width: 100,
        height: 100,
      };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl,
        pageDimensions,
      });

      expect(approxEqual(result.x, 247.5)).toBe(true);
      // pdfY = 842 - (371 + 100) = 371
      expect(approxEqual(result.y, 371)).toBe(true);
    });
  });

  describe("Letter page at 100% zoom, DPR 1", () => {
    const containerEl = makeImageEl(612, 792);
    const pageDimensions = LETTER;
    const zoom = 1.0;

    it("maps overlay correctly on Letter page", () => {
      const overlay: OverlayRect = { x: 100, y: 200, width: 150, height: 80 };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl,
        pageDimensions,
      });

      expect(approxEqual(result.x, 100)).toBe(true);
      // pdfY = 792 - (200 + 80) = 512
      expect(approxEqual(result.y, 512)).toBe(true);
      expect(approxEqual(result.width, 150)).toBe(true);
      expect(approxEqual(result.height, 80)).toBe(true);
    });
  });

  describe("Custom page size at 100% zoom, DPR 1", () => {
    const containerEl = makeImageEl(400, 600);
    const pageDimensions = CUSTOM;
    const zoom = 1.0;

    it("maps overlay correctly on custom page", () => {
      const overlay: OverlayRect = { x: 50, y: 100, width: 80, height: 60 };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl,
        pageDimensions,
      });

      expect(approxEqual(result.x, 50)).toBe(true);
      // pdfY = 600 - (100 + 60) = 440
      expect(approxEqual(result.y, 440)).toBe(true);
    });
  });

  describe("Zoom scaling", () => {
    it("50% zoom doubles the PDF coordinates relative to 100% zoom", () => {
      // At 50% zoom the canvas is half the logical size, so the same CSS pixel
      // position represents twice as many PDF points.
      const containerEl = makeImageEl(595, 842);
      const pageDimensions = A4;

      const overlay: OverlayRect = { x: 100, y: 100, width: 100, height: 100 };

      const at100 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom: 1.0,
        containerEl,
        pageDimensions,
      });
      const at50 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom: 0.5,
        containerEl,
        pageDimensions,
      });

      // At 50% zoom, pdfX = overlay.x * scaleX / 0.5 = 2 * (overlay.x * scaleX / 1.0)
      expect(approxEqual(at50.x, at100.x * 2)).toBe(true);
      expect(approxEqual(at50.width, at100.width * 2)).toBe(true);
    });

    it("150% zoom reduces PDF coordinates relative to 100% zoom", () => {
      const containerEl = makeImageEl(595, 842);
      const pageDimensions = A4;

      const overlay: OverlayRect = { x: 100, y: 100, width: 100, height: 100 };

      const at100 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom: 1.0,
        containerEl,
        pageDimensions,
      });
      const at150 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom: 1.5,
        containerEl,
        pageDimensions,
      });

      expect(approxEqual(at150.x, at100.x / 1.5)).toBe(true);
      expect(approxEqual(at150.width, at100.width / 1.5)).toBe(true);
    });
  });

  describe("DevicePixelRatio correction", () => {
    it("DPR 2: naturalWidth 1190 (= 595 logical × 2) maps same as DPR 1 naturalWidth 595", () => {
      // Both represent a 595 CSS-pixel-wide canvas; results must be identical.
      const pageDimensions = A4;
      const overlay: OverlayRect = { x: 100, y: 200, width: 150, height: 80 };
      const zoom = 1.0;

      setDpr(1);
      const el1 = makeImageEl(595, 842);
      const result1 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl: el1,
        pageDimensions,
      });

      setDpr(2);
      const el2 = makeImageEl(1190, 1684); // 595*2 × 842*2
      const result2 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl: el2,
        pageDimensions,
      });

      expect(approxEqual(result1.x, result2.x)).toBe(true);
      expect(approxEqual(result1.y, result2.y)).toBe(true);
      expect(approxEqual(result1.width, result2.width)).toBe(true);
      expect(approxEqual(result1.height, result2.height)).toBe(true);
    });

    it("DPR 3: naturalWidth 1785 (= 595 logical × 3) maps same as DPR 1 naturalWidth 595", () => {
      const pageDimensions = A4;
      const overlay: OverlayRect = { x: 50, y: 50, width: 100, height: 100 };
      const zoom = 1.0;

      setDpr(1);
      const el1 = makeImageEl(595, 842);
      const result1 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl: el1,
        pageDimensions,
      });

      setDpr(3);
      const el3 = makeImageEl(1785, 2526); // 595*3 × 842*3
      const result3 = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom,
        containerEl: el3,
        pageDimensions,
      });

      expect(approxEqual(result1.x, result3.x)).toBe(true);
      expect(approxEqual(result1.y, result3.y)).toBe(true);
    });
  });

  describe("Y-axis inversion", () => {
    it("overlay at canvas top maps to high pdfY (near page height)", () => {
      const containerEl = makeImageEl(595, 842);
      const overlay: OverlayRect = { x: 0, y: 0, width: 10, height: 10 };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom: 1.0,
        containerEl,
        pageDimensions: A4,
      });
      // pdfY = 842 - 10 = 832 (near top of PDF = near page height)
      expect(result.y).toBeGreaterThan(A4.height / 2);
    });

    it("overlay at canvas bottom maps to low pdfY (near 0)", () => {
      const containerEl = makeImageEl(595, 842);
      const overlay: OverlayRect = { x: 0, y: 800, width: 10, height: 42 };
      const result = mapOverlayToPdf({
        overlay,
        pageIndex: 0,
        zoom: 1.0,
        containerEl,
        pageDimensions: A4,
      });
      // pdfY = 842 - (800 + 42) = 0
      expect(approxEqual(result.y, 0)).toBe(true);
    });
  });
});

// ── mapPdfToOverlay ───────────────────────────────────────────────────────────

describe("mapPdfToOverlay", () => {
  it("inverts mapOverlayToPdf for A4 at 100% zoom", () => {
    const containerEl = makeImageEl(595, 842);
    const pageDimensions = A4;
    const zoom = 1.0;
    const overlay: OverlayRect = { x: 100, y: 200, width: 150, height: 80 };

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

    expect(approxEqual(recovered.x, overlay.x)).toBe(true);
    expect(approxEqual(recovered.y, overlay.y)).toBe(true);
    expect(approxEqual(recovered.width, overlay.width)).toBe(true);
    expect(approxEqual(recovered.height, overlay.height)).toBe(true);
  });

  it("inverts mapOverlayToPdf for Letter at 50% zoom", () => {
    const containerEl = makeImageEl(612, 792);
    const pageDimensions = LETTER;
    const zoom = 0.5;
    const overlay: OverlayRect = { x: 50, y: 80, width: 100, height: 60 };

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

    expect(approxEqual(recovered.x, overlay.x)).toBe(true);
    expect(approxEqual(recovered.y, overlay.y)).toBe(true);
    expect(approxEqual(recovered.width, overlay.width)).toBe(true);
    expect(approxEqual(recovered.height, overlay.height)).toBe(true);
  });

  it("inverts mapOverlayToPdf for custom page at 150% zoom", () => {
    const containerEl = makeImageEl(400, 600);
    const pageDimensions = CUSTOM;
    const zoom = 1.5;
    const overlay: OverlayRect = { x: 30, y: 60, width: 80, height: 40 };

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

    expect(approxEqual(recovered.x, overlay.x)).toBe(true);
    expect(approxEqual(recovered.y, overlay.y)).toBe(true);
    expect(approxEqual(recovered.width, overlay.width)).toBe(true);
    expect(approxEqual(recovered.height, overlay.height)).toBe(true);
  });

  describe("Zoom recomputation (Req 0.9)", () => {
    it("re-anchors overlay correctly when zoom changes from 1.0 to 2.0", () => {
      // Workflow: place overlay at zoom 1.0, export to PDF, then re-render at zoom 2.0.
      // mapPdfToOverlay at zoom 2.0 should give the scaled CSS pixel position.
      const containerEl = makeImageEl(595, 842);
      const pageDimensions = A4;

      const overlayAt1: OverlayRect = {
        x: 100,
        y: 200,
        width: 150,
        height: 80,
      };
      const pdfRect = mapOverlayToPdf({
        overlay: overlayAt1,
        pageIndex: 0,
        zoom: 1.0,
        containerEl,
        pageDimensions,
      });

      // At zoom 2.0 the canvas is twice as large, so CSS pixel values double
      const overlayAt2 = mapPdfToOverlay(
        pdfRect,
        0,
        2.0,
        containerEl,
        pageDimensions,
      );

      expect(approxEqual(overlayAt2.x, overlayAt1.x * 2, 1e-4)).toBe(true);
      expect(approxEqual(overlayAt2.width, overlayAt1.width * 2, 1e-4)).toBe(
        true,
      );
    });
  });
});

// ── mapOverlayToPdfDeferred ───────────────────────────────────────────────────

describe("mapOverlayToPdfDeferred", () => {
  const pageDimensions = A4;
  const zoom = 1.0;
  const overlay: OverlayRect = { x: 100, y: 200, width: 150, height: 80 };

  it("resolves immediately when image is already loaded (naturalWidth > 0)", async () => {
    const containerEl = makeImageEl(595, 842);
    const opts: MapOptions = {
      overlay,
      pageIndex: 0,
      zoom,
      containerEl,
      pageDimensions,
    };

    const result = await mapOverlayToPdfDeferred(opts);

    // Should match synchronous result
    const expected = mapOverlayToPdf(opts);
    expect(approxEqual(result.x, expected.x)).toBe(true);
    expect(approxEqual(result.y, expected.y)).toBe(true);
    expect(approxEqual(result.width, expected.width)).toBe(true);
    expect(approxEqual(result.height, expected.height)).toBe(true);
  });

  it("defers and resolves after load event when naturalWidth is 0", async () => {
    // Start with naturalWidth = 0 (not yet loaded)
    let natW = 0;
    let natH = 0;
    const el = document.createElement("img");
    Object.defineProperty(el, "naturalWidth", {
      get: () => natW,
      configurable: true,
    });
    Object.defineProperty(el, "naturalHeight", {
      get: () => natH,
      configurable: true,
    });

    const opts: MapOptions = {
      overlay,
      pageIndex: 0,
      zoom,
      containerEl: el,
      pageDimensions,
    };
    const promise = mapOverlayToPdfDeferred(opts);

    // Simulate image load: update dimensions then fire the load event
    natW = 595;
    natH = 842;
    el.dispatchEvent(new Event("load"));

    const result = await promise;

    const expected = mapOverlayToPdf({ ...opts, containerEl: el });
    expect(approxEqual(result.x, expected.x)).toBe(true);
    expect(approxEqual(result.y, expected.y)).toBe(true);
  });

  it("rejects when image fires error event", async () => {
    let natW = 0;
    let natH = 0;
    const el = document.createElement("img");
    Object.defineProperty(el, "naturalWidth", {
      get: () => natW,
      configurable: true,
    });
    Object.defineProperty(el, "naturalHeight", {
      get: () => natH,
      configurable: true,
    });

    const opts: MapOptions = {
      overlay,
      pageIndex: 0,
      zoom,
      containerEl: el,
      pageDimensions,
    };
    const promise = mapOverlayToPdfDeferred(opts);

    el.dispatchEvent(new Event("error"));

    await expect(promise).rejects.toThrow(
      "CoordinateMapper: image failed to load",
    );
  });

  it("rejects when load fires but naturalWidth is still 0 (never falls back to hardcoded dims)", async () => {
    // naturalWidth stays 0 even after load — must reject, not use hardcoded fallback
    const el = document.createElement("img");
    Object.defineProperty(el, "naturalWidth", {
      get: () => 0,
      configurable: true,
    });
    Object.defineProperty(el, "naturalHeight", {
      get: () => 0,
      configurable: true,
    });

    const opts: MapOptions = {
      overlay,
      pageIndex: 0,
      zoom,
      containerEl: el,
      pageDimensions,
    };
    const promise = mapOverlayToPdfDeferred(opts);

    el.dispatchEvent(new Event("load"));

    await expect(promise).rejects.toThrow(
      "CoordinateMapper: image loaded but naturalWidth/naturalHeight are still zero",
    );
  });

  it("does not attach a listener when image is already loaded", async () => {
    const el = makeImageEl(595, 842);
    const addSpy = vi.spyOn(el, "addEventListener");

    const opts: MapOptions = {
      overlay,
      pageIndex: 0,
      zoom,
      containerEl: el,
      pageDimensions,
    };
    await mapOverlayToPdfDeferred(opts);

    // Should resolve synchronously without attaching any listener
    expect(addSpy).not.toHaveBeenCalled();
  });
});

// ── Non-standard page sizes (Req 0.8) ────────────────────────────────────────

describe("Non-standard page sizes (Req 0.8)", () => {
  it("handles landscape A4 (842×595)", () => {
    const landscape: PageDimensions = { width: 842, height: 595 };
    const containerEl = makeImageEl(842, 595);
    const overlay: OverlayRect = { x: 100, y: 100, width: 200, height: 100 };

    const result = mapOverlayToPdf({
      overlay,
      pageIndex: 0,
      zoom: 1.0,
      containerEl,
      pageDimensions: landscape,
    });

    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(landscape.width);
    expect(result.y).toBeLessThanOrEqual(landscape.height);
  });

  it("handles very small custom page (100×100 pt)", () => {
    const tiny: PageDimensions = { width: 100, height: 100 };
    const containerEl = makeImageEl(100, 100);
    const overlay: OverlayRect = { x: 10, y: 10, width: 20, height: 20 };

    const result = mapOverlayToPdf({
      overlay,
      pageIndex: 0,
      zoom: 1.0,
      containerEl,
      pageDimensions: tiny,
    });

    expect(approxEqual(result.x, 10)).toBe(true);
    // pdfY = 100 - (10 + 20) = 70
    expect(approxEqual(result.y, 70)).toBe(true);
  });

  it("handles very large custom page (2000×3000 pt)", () => {
    const large: PageDimensions = { width: 2000, height: 3000 };
    const containerEl = makeImageEl(2000, 3000);
    const overlay: OverlayRect = { x: 500, y: 1000, width: 400, height: 300 };

    const result = mapOverlayToPdf({
      overlay,
      pageIndex: 0,
      zoom: 1.0,
      containerEl,
      pageDimensions: large,
    });

    expect(approxEqual(result.x, 500)).toBe(true);
    // pdfY = 3000 - (1000 + 300) = 1700
    expect(approxEqual(result.y, 1700)).toBe(true);
  });
});
