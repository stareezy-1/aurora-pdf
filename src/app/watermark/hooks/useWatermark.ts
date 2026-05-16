import { useState, useEffect, useRef } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  applyWatermark,
  renderPagePreview,
  getPageCount,
} from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { WatermarkConfig } from "@/types/tool.types";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay drag position — null means use placement-based positioning
  // NOTE: drag-to-reposition is intentionally removed — the placement tabs
  // (Diagonal / Header / Footer) map directly to the engine's PLACEMENT_COORDS
  // and produce pixel-perfect results. A free-drag approach requires converting
  // CSS pixels of a scaled preview to PDF points, which is unreliable across
  // different screen sizes and zoom levels.

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Always use placement-based applyWatermark — reliable and accurate
      const result = await applyWatermark(bytes, config, onProgress);
      return {
        blob: new Blob([new Uint8Array(result)], { type: "application/pdf" }),
        filename: buildOutputFilename(file.name, "watermark"),
      };
    },
  });

  // Debounced preview refresh (previews already loaded on drop — no-op)
  useEffect(() => {
    if (!pdfBytes) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // previews already loaded on drop
    }, 300);
  }, [pdfBytes, config]);

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
  }

  function getWmStyle(): React.CSSProperties {
    const base: React.CSSProperties = {
      position: "absolute",
      color: config.color,
      fontSize: Math.max(8, config.fontSize * 0.22),
      opacity: config.opacity / 100,
      fontWeight: 700,
      pointerEvents: "none",
      whiteSpace: "nowrap",
      textShadow: "0 1px 2px rgba(0,0,0,0.15)",
      userSelect: "none",
    };

    if (config.placement === "diagonal") {
      return {
        ...base,
        top: "40%",
        left: "10%",
        transform: `rotate(-${config.rotation}deg)`,
      };
    } else if (config.placement === "header") {
      return { ...base, top: "4%", left: "50%", transform: "translateX(-50%)" };
    } else {
      return {
        ...base,
        bottom: "4%",
        left: "50%",
        transform: "translateX(-50%)",
      };
    }
  }

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
    getWmStyle,
  };
}
