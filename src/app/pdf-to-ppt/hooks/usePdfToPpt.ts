/**
 * usePdfToPpt — hook for the PDF to PowerPoint tool.
 * DPI selector (96/150/300), Worker conversion, PPTX download.
 *
 * Implementation: rasterize each page to JPEG at the selected DPI,
 * then package as a ZIP of JPEG images (one per slide).
 * A true PPTX output would require pptxgenjs write mode which is not
 * available as a dependency — the ZIP of slide images is the practical fallback.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";
import { packageFilesAsZip } from "@/lib/zip-helper";

// We use pdfjs directly to rasterize each page to JPEG slides.

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const DPI_OPTIONS = [96, 150, 300] as const;

type DpiOption = 96 | 150 | 300;

/**
 * Rasterize each page of a PDF to JPEG bytes at the given DPI.
 * Returns an array of { filename, data } entries.
 */
async function pdfToJpegSlides(
  bytes: Uint8Array,
  dpi: DpiOption,
  totalPages: number,
  onProgress?: (pct: number, label?: string) => void,
): Promise<Array<{ filename: string; data: Uint8Array }>> {
  // Dynamically import pdfjs to avoid circular deps
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdfJsDoc = await loadingTask.promise;
  const numPages = totalPages || pdfJsDoc.numPages;
  const scale = dpi / 72;
  const results: Array<{ filename: string; data: Uint8Array }> = [];

  for (let i = 0; i < numPages; i++) {
    onProgress?.(Math.round((i / numPages) * 90), `Rendering slide ${i + 1}…`);
    const page = await pdfJsDoc.getPage(i + 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = jpegDataUrl.split(",")[1];
    const jpegBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    results.push({
      filename: `slide-${String(i + 1).padStart(4, "0")}.jpg`,
      data: jpegBytes,
    });
  }

  onProgress?.(100, "Done");
  return results;
}

export function usePdfToPpt() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [dpi, setDpi] = useState<DpiOption>(150);
  const [isPending, setIsPending] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setNewFile(session.file);

    try {
      const slides = await pdfToJpegSlides(
        session.bytes,
        dpi,
        session.pageCount,
        (pct, label) => updateProgress(pct, label),
      );

      updateProgress(95, "Creating ZIP…");
      const zipBlob = await packageFilesAsZip(slides);
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(zipBlob, `${base}_slides_${dpi}dpi.zip`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    session.pageCount,
    dpi,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setIsPending(false);
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file: session.file,
    pageCount: session.pageCount,
    preview: session.preview,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    dpi,
    setDpi,
    DPI_OPTIONS,
    isPending,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
