import { useState, useEffect, useRef, useCallback } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  applyWatermark,
  renderPagePreview,
  getPageCount,
} from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { WatermarkConfig } from "@/types/tool.types";

// DEFAULT CONFIG
const DEFAULT_CONFIG: WatermarkConfig = {
  text: "CONFIDENTIAL",
  fontSize: 48,
  opacity: 50,
  color: "#888888",
  rotation: 45,
  placement: "diagonal",
  fontFamily: "Helvetica",
};

export function useWatermark() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);
  const [previewAllPages, setPreviewAllPages] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Draw watermark on canvas overlay whenever config, previews, or current page changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgSrc = pagePreviews[currentPage];
    if (!imgSrc) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.globalAlpha = config.opacity / 100;
      ctx.font = `bold ${config.fontSize}px ${config.fontFamily}, sans-serif`;
      ctx.fillStyle = config.color;

      if (config.placement === "diagonal") {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((-config.rotation * Math.PI) / 180);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(config.text, 0, 0);
      } else if (config.placement === "header") {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(config.text, canvas.width / 2, canvas.height * 0.04);
      } else {
        // footer
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(config.text, canvas.width / 2, canvas.height * 0.96);
      }

      ctx.restore();
    };
    img.src = imgSrc;
  }, [config, pagePreviews, currentPage]);

  // "Preview all pages" cycling — advance page every 1.5s
  useEffect(() => {
    if (previewAllPages && pageCount > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentPage((p) => (p + 1) % pageCount);
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
  }, [previewAllPages, pageCount]);

  const togglePreviewAllPages = useCallback(() => {
    setPreviewAllPages((prev) => !prev);
  }, []);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await applyWatermark(bytes, config, onProgress);
      return {
        blob: new Blob([new Uint8Array(result)], { type: "application/pdf" }),
        filename: buildOutputFilename(file.name, "watermark"),
      };
    },
  });

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    setPdfFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
    const n = await getPageCount(bytes);
    setPageCount(n);
    setCurrentPage(0);
    const previews: string[] = [];
    for (let i = 0; i < Math.min(n, 20); i++) {
      previews.push(await renderPagePreview(bytes, i));
    }
    setPagePreviews(previews);
  }

  function update(patch: Partial<WatermarkConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  function handleReset() {
    clearWorkbox();
    setPdfFile(null);
    setPdfBytes(null);
    setPagePreviews([]);
    setConfig(DEFAULT_CONFIG);
    setPreviewAllPages(false);
  }

  // Keep pdfBytes in state but suppress unused warning
  void pdfBytes;

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pdfFile,
    pageCount,
    pagePreviews,
    currentPage,
    setCurrentPage,
    config,
    processor,
    handleFileDrop,
    update,
    handleReset,
    canvasRef,
    previewAllPages,
    togglePreviewAllPages,
  };
}
