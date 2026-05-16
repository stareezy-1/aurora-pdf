/**
 * pdf-lib.worker.ts
 *
 * Web Worker for offloading large-file PDF compression (> 20 MB) off the main thread.
 *
 * Note: Comlink is not listed as a dependency in package.json, so this worker uses
 * the native Worker postMessage / onmessage protocol instead.
 *
 * Message protocol:
 *   Incoming  → { id: string; fileBytes: Uint8Array; level: CompressionLevel; }
 *   Outgoing  → { id: string; type: 'progress'; progress: number; label: string }
 *             | { id: string; type: 'result';   result: Uint8Array }
 *             | { id: string; type: 'error';    message: string }
 */

import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type { CompressionLevel } from "@/types/tool.types";

// ---------------------------------------------------------------------------
// pdfjs worker — must be configured inside the worker context too
// ---------------------------------------------------------------------------
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// ---------------------------------------------------------------------------
// Helpers (duplicated from pdf-engine.ts to keep the worker self-contained)
// ---------------------------------------------------------------------------

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

async function loadPdfJs(bytes: Uint8Array) {
  return pdfjsLib.getDocument({ data: copyBytes(bytes) }).promise;
}

const JPEG_QUALITY: Record<CompressionLevel, number> = {
  low: 0.85,
  standard: 0.65,
  high: 0.4,
};

// ---------------------------------------------------------------------------
// compress — same algorithm as pdf-engine.ts but runs in the worker thread
// ---------------------------------------------------------------------------

async function compress(
  fileBytes: Uint8Array,
  level: CompressionLevel,
  onProgress: (progress: number, label: string) => void,
): Promise<Uint8Array> {
  onProgress(0, "Loading PDF…");
  const quality = JPEG_QUALITY[level];

  const srcDoc = await PDFDocument.load(copyBytes(fileBytes));
  const srcPages = srcDoc.getPages();

  const newDoc = await PDFDocument.create();
  const pdfJsDoc = await loadPdfJs(fileBytes);
  const pageCount = pdfJsDoc.numPages;

  for (let i = 0; i < pageCount; i++) {
    onProgress(
      Math.round((i / pageCount) * 85),
      `Compressing page ${i + 1} of ${pageCount}…`,
    );

    const pdfJsPage = await pdfJsDoc.getPage(i + 1);
    const viewport = pdfJsPage.getViewport({ scale: 1.0 });

    // OffscreenCanvas is available in worker contexts (Chrome 69+, Firefox 105+)
    const canvas = new OffscreenCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height),
    );
    const ctx = canvas.getContext("2d")!;
    await pdfJsPage.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    // Encode as JPEG blob then convert to Uint8Array
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    const arrayBuffer = await blob.arrayBuffer();
    const imgBytes = new Uint8Array(arrayBuffer);

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
// Message handler
// ---------------------------------------------------------------------------

interface WorkerRequest {
  id: string;
  fileBytes: Uint8Array;
  level: CompressionLevel;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, fileBytes, level } = event.data;

  try {
    const result = await compress(fileBytes, level, (progress, label) => {
      self.postMessage({ id, type: "progress", progress, label });
    });

    // Transfer the result buffer to avoid copying
    self.postMessage(
      { id, type: "result", result },
      { transfer: [result.buffer] },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, type: "error", message });
  }
};
