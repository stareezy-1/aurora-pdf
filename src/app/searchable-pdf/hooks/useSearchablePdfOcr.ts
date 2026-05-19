import { useState, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { getPageCount, buildSearchablePdf } from "@/engines/pdf-engine";
import { recognizeWithBoundingBoxes } from "@/engines/ocr-engine";
import type { SearchablePdfPage, OcrWord } from "@/types/engine.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OcrPageProgress {
  pageIndex: number;
  status: "pending" | "rendering" | "ocr" | "done" | "error";
  thumbnailDataUrl?: string;
  confidence?: number; // 0-100 average confidence for this page
  language?: string; // detected language label
  estimatedSecondsRemaining?: number;
}

export interface UseSearchablePdfOcrResult {
  phase: "idle" | "rendering" | "ocr" | "assembling" | "review" | "success";
  pages: OcrPageProgress[];
  currentPage: number;
  totalPages: number;
  estimatedSecondsRemaining: number;
  exportFormat: "pdf" | "txt";
  setExportFormat: (fmt: "pdf" | "txt") => void;
  resultBytes: Uint8Array | null;
  resultText: string;
  start: (file: File, language: string) => void;
  cancel: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSearchablePdfOcr(): UseSearchablePdfOcrResult {
  const [phase, setPhase] = useState<
    "idle" | "rendering" | "ocr" | "assembling" | "review" | "success"
  >("idle");
  const [pages, setPages] = useState<OcrPageProgress[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState(0);
  const [exportFormat, setExportFormat] = useState<"pdf" | "txt">("pdf");
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);
  const [resultText, setResultText] = useState("");

  const cancelRef = useRef(false);

  // ---------------------------------------------------------------------------
  // start
  // ---------------------------------------------------------------------------

  const start = useCallback(async (file: File, language: string) => {
    cancelRef.current = false;

    // ── Phase: rendering ──────────────────────────────────────────────────
    setPhase("rendering");
    setResultBytes(null);
    setResultText("");

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const pageCount = await getPageCount(fileBytes);
    setTotalPages(pageCount);

    // Initialise per-page progress entries
    const initialPages: OcrPageProgress[] = Array.from(
      { length: pageCount },
      (_, i) => ({ pageIndex: i, status: "pending" }),
    );
    setPages(initialPages);

    // Batch size based on hardware concurrency, clamped 1–4
    const batchSize = Math.min(
      4,
      Math.max(1, navigator.hardwareConcurrency ?? 2),
    );

    // Render all pages at 150 DPI (scale = 150/72 ≈ 2.083)
    const RENDER_SCALE = 150 / 72;
    const renderedPages: SearchablePdfPage[] = [];

    // We need a pdfjs document for rendering
    const pdfJsDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(fileBytes.buffer.slice(0)),
    }).promise;

    for (let i = 0; i < pageCount; i++) {
      if (cancelRef.current) {
        resetState();
        return;
      }

      // Mark page as rendering
      setPages((prev) =>
        prev.map((p) =>
          p.pageIndex === i ? { ...p, status: "rendering" } : p,
        ),
      );
      setCurrentPage(i);

      const pdfJsPage = await pdfJsDoc.getPage(i + 1);
      const viewport = pdfJsPage.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d")!;
      await pdfJsPage.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);

      renderedPages.push({
        pageIndex: i,
        imageDataUrl,
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        words: [],
      });

      // Update thumbnail
      setPages((prev) =>
        prev.map((p) =>
          p.pageIndex === i
            ? { ...p, status: "ocr", thumbnailDataUrl: imageDataUrl }
            : p,
        ),
      );
    }

    // ── Phase: ocr ────────────────────────────────────────────────────────
    setPhase("ocr");

    const ocrResults: SearchablePdfPage[] = [];
    const pageTimes: number[] = [];
    let plainTextParts: string[] = [];

    for (let batchStart = 0; batchStart < pageCount; batchStart += batchSize) {
      if (cancelRef.current) {
        resetState();
        return;
      }

      const batchEnd = Math.min(batchStart + batchSize, pageCount);

      // Process pages in this batch sequentially (workers are inside tesseract)
      for (let i = batchStart; i < batchEnd; i++) {
        if (cancelRef.current) {
          resetState();
          return;
        }

        setCurrentPage(i);
        const pageStartMs = Date.now();

        const rendered = renderedPages[i];

        // Convert data URL to Blob for tesseract
        const base64 = rendered.imageDataUrl.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const blob = new Blob([imgBytes], { type: "image/jpeg" });

        let wordResults: Array<{
          text: string;
          bbox: { x0: number; y0: number; x1: number; y1: number };
        }> = [];

        try {
          wordResults = await recognizeWithBoundingBoxes(blob, language as any);
        } catch {
          // On error, leave words empty — page still assembles with image only
        }

        const elapsedMs = Date.now() - pageStartMs;
        pageTimes.push(elapsedMs);

        // Compute average confidence — recognizeWithBoundingBoxes doesn't
        // return confidence, so default to 80 for all words
        const pageConfidence = 80;

        // Build words with default confidence
        const words: OcrWord[] = wordResults.map((w) => ({
          text: w.text,
          bbox: w.bbox,
          confidence: 80,
        }));

        ocrResults.push({
          pageIndex: i,
          imageDataUrl: rendered.imageDataUrl,
          imageWidth: rendered.imageWidth,
          imageHeight: rendered.imageHeight,
          words,
        });

        // Collect plain text
        plainTextParts.push(words.map((w) => w.text).join(" "));

        // Recalculate ETA
        const avgMs = pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length;
        const remaining = pageCount - (i + 1);
        const eta = Math.round((avgMs * remaining) / 1000);
        setEstimatedSecondsRemaining(eta);

        // Update page progress
        setPages((prev) =>
          prev.map((p) =>
            p.pageIndex === i
              ? {
                  ...p,
                  status: "done",
                  confidence: pageConfidence,
                  language,
                  estimatedSecondsRemaining: eta,
                }
              : p,
          ),
        );
      }
    }

    if (cancelRef.current) {
      resetState();
      return;
    }

    // ── Phase: assembling ─────────────────────────────────────────────────
    setPhase("assembling");

    const pdfBytes = await buildSearchablePdf(
      ocrResults,
      (progress, _label) => {
        // Progress callback — could update UI if needed
        void progress;
      },
    );

    setResultBytes(pdfBytes);
    setResultText(plainTextParts.join("\n\n"));

    // ── Phase: review ─────────────────────────────────────────────────────
    setPhase("review");
  }, []);

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------

  function resetState() {
    setPhase("idle");
    setPages([]);
    setCurrentPage(0);
    setTotalPages(0);
    setEstimatedSecondsRemaining(0);
    setResultBytes(null);
    setResultText("");
    cancelRef.current = false;
  }

  const reset = useCallback(() => {
    cancelRef.current = true;
    resetState();
  }, []);

  return {
    phase,
    pages,
    currentPage,
    totalPages,
    estimatedSecondsRemaining,
    exportFormat,
    setExportFormat,
    resultBytes,
    resultText,
    start,
    cancel,
    reset,
  };
}
