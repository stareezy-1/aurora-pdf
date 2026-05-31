/**
 * useWatermark — upgraded hook for the Add Watermark tool.
 *
 * Changes from the original:
 * - Uses useFileSession + usePdfProcessor instead of useFileProcessor
 * - Supports both text and image watermark types
 * - Supports all placement modes: center, top-left, top-right, bottom-left,
 *   bottom-right, custom (X/Y %)
 * - Supports tile mode, page range targeting, layer control (fg/bg)
 * - Live preview via drawWatermarkPreview from watermark-engine
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  applyWatermark,
  drawWatermarkPreview,
} from "@/engines/watermark-engine";
import type { WatermarkConfig } from "@/types/tool.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

/** Maximum image watermark file size (5 MB). Requirement 5.10 */
const MAX_IMAGE_MB = 5;

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: WatermarkConfig = {
  type: "text",
  text: "CONFIDENTIAL",
  fontFamily: "Helvetica",
  fontSize: 48,
  color: "#888888",
  imageDataUrl: undefined,
  opacity: 50,
  rotation: 45,
  placement: "center",
  customX: 50,
  customY: 50,
  tile: false,
  layer: "foreground",
  pageRange: "",
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWatermark() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  // ── File session ──────────────────────────────────────────────────────────
  const session = useFileSession({
    accept: PDF_ACCEPT,
    generateAllPreviews: true,
  });

  // ── Watermark config ──────────────────────────────────────────────────────
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);

  // ── Page navigation ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(0);
  const [previewAllPages, setPreviewAllPages] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Canvas preview ref ────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Image watermark error ─────────────────────────────────────────────────
  const [imageError, setImageError] = useState<string | null>(null);

  // ── Draw watermark preview on canvas whenever config or page changes ──────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgSrc = session.allPreviews[currentPage];
    if (!imgSrc) return;

    drawWatermarkPreview(canvas, imgSrc, config);
  }, [config, session.allPreviews, currentPage]);

  // ── "Preview all pages" cycling ───────────────────────────────────────────
  useEffect(() => {
    if (previewAllPages && session.pageCount > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentPage((p) => (p + 1) % session.pageCount);
      }, 1500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [previewAllPages, session.pageCount]);

  const togglePreviewAllPages = useCallback(() => {
    setPreviewAllPages((prev) => !prev);
  }, []);

  // ── Processor ─────────────────────────────────────────────────────────────
  const processor = usePdfProcessor<WatermarkConfig>({
    processFn: async (bytes, cfg, onProgress) => {
      return applyWatermark(bytes, cfg, onProgress);
    },
    outputSuffix: "watermark",
  });

  // ── Config update helper ──────────────────────────────────────────────────
  function update(patch: Partial<WatermarkConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  // ── Image watermark upload ────────────────────────────────────────────────
  function handleImageUpload(file: File) {
    setImageError(null);

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(
        `Image file is too large (${(file.size / 1024 / 1024).toFixed(
          1,
        )} MB). Maximum allowed size is ${MAX_IMAGE_MB} MB.`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      update({ imageDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  // ── Apply / reset ─────────────────────────────────────────────────────────
  function handleApply() {
    if (!session.file) return;
    processor.run(session.file, config);
  }

  function handleReset() {
    session.reset();
    setConfig(DEFAULT_CONFIG);
    setCurrentPage(0);
    setPreviewAllPages(false);
    setImageError(null);
  }

  return {
    // Store state
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,

    // File session
    pdfFile: session.file,
    pageCount: session.pageCount,
    pagePreviews: session.allPreviews,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,

    // Page navigation
    currentPage,
    setCurrentPage,
    previewAllPages,
    togglePreviewAllPages,

    // Config
    config,
    update,

    // Image watermark
    handleImageUpload,
    imageError,

    // Canvas preview
    canvasRef,

    // Apply / reset
    processor,
    handleApply,
    handleReset,

    MAX_IMAGE_MB,
  };
}
