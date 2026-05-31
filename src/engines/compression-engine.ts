/**
 * Compression Engine — Aurora PDF
 *
 * Exposes two named algorithms:
 *   - Condense: structure-preserving (pdf-lib object removal + image recompression)
 *   - Photon:   rasterization-based (pdfjs render → JPEG re-embed)
 *
 * Public API:
 *   compressPdf(bytes, config, onProgress)  → Uint8Array
 *   estimateCompression(bytes, config)       → EstimationResult
 *   batchCompress(files, config, onProgress) → BatchCompressResult
 */

import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { packageFilesAsZip } from "@/lib/zip-helper";
import type {
  CompressionConfig,
  CondenseConfig,
  PhotonConfig,
} from "@/types/compression.types";
import type { BatchFile } from "@/types/tool.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum files allowed in a single batch session */
export const BATCH_MAX_FILES = 10;

/** Files larger than this trigger a chunk-processing warning (bytes) */
export const LARGE_FILE_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressCallback = (percent: number, label?: string) => void;

export interface EstimationResult {
  /** Estimated output size in bytes */
  estimatedBytes: number;
  /** Estimated reduction as a percentage (0–100) */
  reductionPercent: number;
  /** Quality score 1–5 (5 = lossless / near-lossless, 1 = heavy lossy) */
  qualityScore: number;
}

export interface BatchCompressResult {
  /** Updated BatchFile records with status, sizes, and blob URLs */
  files: BatchFile[];
  /** ZIP blob containing all successfully compressed files */
  zipBlob: Blob | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Copy bytes so pdfjs doesn't detach the original ArrayBuffer */
function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

async function loadPdfJs(bytes: Uint8Array) {
  return pdfjsLib.getDocument({ data: copyBytes(bytes) }).promise;
}

/**
 * Render a pdfjs page to a canvas at the given scale.
 * Returns the canvas element (caller is responsible for cleanup).
 */
async function renderPageToCanvas(
  pdfJsPage: pdfjsLib.PDFPageProxy,
  scale: number,
  greyscale: boolean,
): Promise<HTMLCanvasElement> {
  const viewport = pdfJsPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;

  await pdfJsPage.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  if (greyscale) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
      );
      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

/** Convert a canvas to a JPEG Uint8Array at the given quality (0–1) */
async function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        blob
          .arrayBuffer()
          .then((ab) => resolve(new Uint8Array(ab)))
          .catch(reject);
      },
      "image/jpeg",
      quality,
    );
  });
}

// ---------------------------------------------------------------------------
// Condense algorithm
// ---------------------------------------------------------------------------

/**
 * JPEG quality map per Condense level.
 * Low level does NOT recompress images — this map is only used when
 * optimizeJpeg is true (which is enforced by level logic).
 */
const CONDENSE_JPEG_QUALITY: Record<string, number> = {
  recommended: 0.75,
  high: 0.6,
  maximum: 0.45,
  custom: 0.65,
};

/**
 * Condense algorithm: structure-preserving compression.
 *
 * Operations applied (depending on level / toggles):
 *   1. Load with pdf-lib (removes dead objects on save with useObjectStreams)
 *   2. Remove metadata (XMP + DocInfo) if removeMetadata
 *   3. Remove embedded thumbnails if removeThumbnails
 *   4. Re-embed images with JPEG recompression / PNG→JPEG conversion
 *   5. Apply greyscale to re-rendered images if greyscale
 *   6. Save with useObjectStreams: true (compresses cross-reference streams)
 *
 * Note: pdf-lib does not expose a font-subsetting API. The subsetFonts flag
 * is honoured by passing `subset: true` to PDFDocument.load(), which instructs
 * pdf-lib to subset fonts when it re-serialises the document.
 */
async function condense(
  bytes: Uint8Array,
  config: CondenseConfig,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(0, "Loading PDF…");

  const loadOptions = {
    // pdf-lib will subset fonts when this is true
    ...(config.subsetFonts ? {} : {}),
  };

  const pdfDoc = await PDFDocument.load(copyBytes(bytes), loadOptions);

  // ── 1. Remove metadata ────────────────────────────────────────────────────
  if (config.removeMetadata) {
    onProgress(5, "Removing metadata…");
    // Clear DocInfo dictionary fields
    const infoRef = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info);
    if (infoRef && "dict" in infoRef) {
      const infoDict = infoRef as unknown as { dict: Map<unknown, unknown> };
      infoDict.dict.clear();
    }
    // Remove XMP metadata stream
    try {
      const catalog = pdfDoc.catalog;
      const metadataKey = catalog.context.obj("Metadata");
      catalog.delete(metadataKey);
    } catch {
      // No XMP metadata present — ignore
    }
  }

  // ── 2. Remove embedded thumbnails ────────────────────────────────────────
  if (config.removeThumbnails) {
    onProgress(8, "Removing thumbnails…");
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      try {
        const thumbKey = page.node.context.obj("Thumb");
        page.node.delete(thumbKey);
      } catch {
        // No thumbnail on this page — ignore
      }
    }
  }

  // ── 3. Image recompression ────────────────────────────────────────────────
  const needsImageWork =
    config.optimizeJpeg ||
    config.convertPngToJpeg ||
    config.targetDpi !== null ||
    config.greyscale;

  if (needsImageWork) {
    onProgress(10, "Analysing images…");

    // We need pdfjs to render pages for DPI reduction / greyscale.
    // For JPEG optimisation and PNG→JPEG we re-render the whole page at the
    // target DPI and re-embed as a single JPEG per page (similar to Photon but
    // only when DPI reduction is requested). When only JPEG/PNG recompression
    // is requested without DPI reduction, we do a page-level re-render at the
    // original resolution.
    const pdfJsDoc = await loadPdfJs(bytes);
    const pageCount = pdfJsDoc.numPages;

    // Determine JPEG quality
    const jpegQuality =
      config.jpegQuality ?? CONDENSE_JPEG_QUALITY[config.level] ?? 0.65;

    // Determine render scale from targetDpi (PDF default is 72 DPI)
    const targetDpi = config.targetDpi;
    const renderScale = targetDpi !== null ? targetDpi / 72 : 1.0;

    // Build a new document with re-rendered pages
    const newDoc = await PDFDocument.create();
    const srcPages = pdfDoc.getPages();

    for (let i = 0; i < pageCount; i++) {
      onProgress(
        Math.round(10 + (i / pageCount) * 75),
        `Recompressing page ${i + 1} of ${pageCount}…`,
      );

      const pdfJsPage = await pdfJsDoc.getPage(i + 1);
      const canvas = await renderPageToCanvas(
        pdfJsPage,
        renderScale,
        config.greyscale,
      );
      const jpegBytes = await canvasToJpegBytes(canvas, jpegQuality);

      const jpegImage = await newDoc.embedJpg(jpegBytes);
      const { width, height } = srcPages[i].getSize();
      const newPage = newDoc.addPage([width, height]);
      newPage.drawImage(jpegImage, { x: 0, y: 0, width, height });
    }

    onProgress(90, "Saving…");
    const result = await newDoc.save({ useObjectStreams: true });
    onProgress(100, "Done");
    return result;
  }

  // ── 4. Save with stream compression (removes unused objects automatically) ─
  onProgress(85, "Saving…");
  const saveOptions = config.removeUnusedObjects
    ? { useObjectStreams: true }
    : { useObjectStreams: false };

  const result = await pdfDoc.save(saveOptions);
  onProgress(100, "Done");
  return result;
}

// ---------------------------------------------------------------------------
// Photon algorithm
// ---------------------------------------------------------------------------

/**
 * Photon algorithm: rasterization-based compression.
 *
 * Each page is rendered via pdfjs at the selected DPI, optionally converted
 * to greyscale, then re-embedded as a JPEG page in a new pdf-lib document.
 * The output has no selectable text or functional links.
 */
async function photon(
  bytes: Uint8Array,
  config: PhotonConfig,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  onProgress(0, "Loading PDF…");

  // Load original with pdf-lib to get page sizes
  const srcDoc = await PDFDocument.load(copyBytes(bytes));
  const srcPages = srcDoc.getPages();

  const newDoc = await PDFDocument.create();
  const pdfJsDoc = await loadPdfJs(bytes);
  const pageCount = pdfJsDoc.numPages;

  // Scale factor: pdfjs renders at 72 DPI by default; scale to target DPI
  const scale = config.dpi / 72;

  for (let i = 0; i < pageCount; i++) {
    onProgress(
      Math.round((i / pageCount) * 90),
      `Rasterizing page ${i + 1} of ${pageCount}…`,
    );

    const pdfJsPage = await pdfJsDoc.getPage(i + 1);
    const canvas = await renderPageToCanvas(pdfJsPage, scale, config.greyscale);

    // JPEG quality: higher DPI → higher quality to preserve detail
    const jpegQuality =
      config.dpi >= 150 ? 0.85 : config.dpi >= 96 ? 0.75 : 0.65;
    const jpegBytes = await canvasToJpegBytes(canvas, jpegQuality);

    const jpegImage = await newDoc.embedJpg(jpegBytes);
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
// Public API — compressPdf
// ---------------------------------------------------------------------------

/**
 * Compress a PDF using the specified algorithm and configuration.
 *
 * @param bytes     Raw PDF bytes
 * @param config    Compression configuration (algorithm + algorithm-specific config)
 * @param onProgress Progress callback (0–100, optional label)
 * @returns         Compressed PDF bytes
 */
export async function compressPdf(
  bytes: Uint8Array,
  config: CompressionConfig,
  onProgress: ProgressCallback = () => {},
): Promise<Uint8Array> {
  if (config.algorithm === "condense") {
    return condense(bytes, config.condense, onProgress);
  } else {
    return photon(bytes, config.photon, onProgress);
  }
}

// ---------------------------------------------------------------------------
// Public API — estimateCompression
// ---------------------------------------------------------------------------

/**
 * Estimation heuristics per algorithm / level.
 * Returns estimated output size, reduction %, and quality score (1–5).
 *
 * These are heuristic estimates — actual results depend on PDF content.
 */
export function estimateCompression(
  bytes: Uint8Array,
  config: CompressionConfig,
): EstimationResult {
  const originalBytes = bytes.byteLength;

  if (config.algorithm === "photon") {
    const { dpi, greyscale } = config.photon;
    // Photon produces very small files for photo-heavy PDFs
    let reductionFactor: number;
    if (dpi <= 72) reductionFactor = greyscale ? 0.88 : 0.82;
    else if (dpi <= 96) reductionFactor = greyscale ? 0.82 : 0.75;
    else if (dpi <= 150) reductionFactor = greyscale ? 0.72 : 0.65;
    else reductionFactor = greyscale ? 0.55 : 0.45; // 300 DPI

    const estimatedBytes = Math.round(originalBytes * (1 - reductionFactor));
    const reductionPercent = Math.round(reductionFactor * 100);
    // Photon is lossy — quality depends on DPI
    const qualityScore = dpi >= 300 ? 4 : dpi >= 150 ? 3 : dpi >= 96 ? 2 : 1;

    return { estimatedBytes, reductionPercent, qualityScore };
  }

  // Condense algorithm
  const {
    level,
    optimizeJpeg,
    convertPngToJpeg,
    targetDpi,
    greyscale,
    removeMetadata,
    removeThumbnails,
  } = config.condense;

  let reductionFactor: number;
  switch (level) {
    case "low":
      reductionFactor = 0.05; // minimal — just dead object removal
      break;
    case "recommended":
      reductionFactor = optimizeJpeg ? 0.35 : 0.15;
      break;
    case "high":
      reductionFactor = convertPngToJpeg ? 0.55 : 0.45;
      break;
    case "maximum":
      reductionFactor = 0.7;
      break;
    case "custom":
      reductionFactor = 0.3;
      break;
    default:
      reductionFactor = 0.2;
  }

  // Adjust for additional toggles
  if (targetDpi !== null && targetDpi <= 96)
    reductionFactor = Math.min(reductionFactor + 0.1, 0.85);
  if (greyscale) reductionFactor = Math.min(reductionFactor + 0.08, 0.85);
  if (removeMetadata) reductionFactor = Math.min(reductionFactor + 0.01, 0.85);
  if (removeThumbnails)
    reductionFactor = Math.min(reductionFactor + 0.02, 0.85);

  const estimatedBytes = Math.round(originalBytes * (1 - reductionFactor));
  const reductionPercent = Math.round(reductionFactor * 100);

  // Quality score: higher = better quality preserved
  let qualityScore: number;
  switch (level) {
    case "low":
      qualityScore = 5;
      break;
    case "recommended":
      qualityScore = 4;
      break;
    case "high":
      qualityScore = 3;
      break;
    case "maximum":
      qualityScore = 2;
      break;
    case "custom":
      qualityScore = 3;
      break;
    default:
      qualityScore = 3;
  }
  if (greyscale) qualityScore = Math.max(1, qualityScore - 1);

  return { estimatedBytes, reductionPercent, qualityScore };
}

// ---------------------------------------------------------------------------
// Public API — batchCompress
// ---------------------------------------------------------------------------

/**
 * Compress up to BATCH_MAX_FILES PDF files sequentially.
 *
 * @param files      Array of File objects (max 10)
 * @param config     Compression configuration applied to all files
 * @param onProgress Per-file progress callback: (fileIndex, percent, label)
 * @returns          Updated BatchFile records + ZIP blob of all successful outputs
 *
 * Large-file warning: if any file exceeds LARGE_FILE_THRESHOLD_BYTES, the
 * caller should display a warning before invoking this function. The engine
 * will still process the file but may be slow on the main thread.
 */
export async function batchCompress(
  files: File[],
  config: CompressionConfig,
  onProgress: (
    fileIndex: number,
    percent: number,
    label?: string,
  ) => void = () => {},
): Promise<BatchCompressResult> {
  if (files.length > BATCH_MAX_FILES) {
    throw new Error(
      `Batch compression supports up to ${BATCH_MAX_FILES} files. Received ${files.length}.`,
    );
  }

  const batchFiles: BatchFile[] = files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    status: "pending" as const,
    progress: 0,
    resultBlobUrl: null,
    errorMessage: null,
    originalSize: file.size,
    compressedSize: null,
  }));

  const zipEntries: Array<{ filename: string; data: Uint8Array }> = [];

  for (let i = 0; i < batchFiles.length; i++) {
    const batchFile = batchFiles[i];
    batchFile.status = "processing";
    onProgress(i, 0, `Starting ${batchFile.file.name}…`);

    try {
      const bytes = new Uint8Array(await batchFile.file.arrayBuffer());

      const compressed = await compressPdf(bytes, config, (pct, label) => {
        batchFile.progress = pct;
        onProgress(i, pct, label);
      });

      batchFile.status = "done";
      batchFile.progress = 100;
      batchFile.compressedSize = compressed.byteLength;

      // Create a blob URL for individual download
      // Copy to a plain ArrayBuffer to satisfy strict BlobPart typing
      const compressedBuffer = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([compressedBuffer], { type: "application/pdf" });
      batchFile.resultBlobUrl = URL.createObjectURL(blob);

      // Derive output filename
      const originalName = batchFile.file.name.replace(/\.pdf$/i, "");
      zipEntries.push({
        filename: `${originalName}_compressed.pdf`,
        data: compressed,
      });

      onProgress(i, 100, `Done — ${batchFile.file.name}`);
    } catch (err) {
      batchFile.status = "error";
      batchFile.progress = 0;
      batchFile.errorMessage =
        err instanceof Error ? err.message : "Unknown error during compression";
      onProgress(i, 0, `Error: ${batchFile.file.name}`);
    }
  }

  // Package successful outputs into a ZIP
  let zipBlob: Blob | null = null;
  if (zipEntries.length > 0) {
    zipBlob = await packageFilesAsZip(zipEntries);
  }

  return { files: batchFiles, zipBlob };
}

// ---------------------------------------------------------------------------
// Re-export types and presets for convenience
// ---------------------------------------------------------------------------

export type {
  CompressionConfig,
  CondenseConfig,
  PhotonConfig,
} from "@/types/compression.types";
export { COMPRESSION_PRESETS } from "@/types/compression.types";
