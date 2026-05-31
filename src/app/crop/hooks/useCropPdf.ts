/**
 * useCropPdf — hook for the Crop PDF tool.
 * Draggable crop handles overlay, margin inputs (pt/mm), page range, validation.
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { cropPages } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import type { CropConfig } from "@/types/tool.types";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const DEFAULT_CONFIG: CropConfig = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pageRange: "",
};

export type CropUnit = "pt" | "mm";

const MM_TO_PT = 2.8346;

function toPoints(value: number, unit: CropUnit): number {
  return unit === "mm" ? value * MM_TO_PT : value;
}

export function useCropPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  const [config, setConfig] = useState<CropConfig>(DEFAULT_CONFIG);
  const [unit, setUnit] = useState<CropUnit>("pt");
  const [validationError, setValidationError] = useState<string | null>(null);

  const processor = usePdfProcessor<CropConfig>({
    processFn: async (bytes, cfg) => {
      return cropPages(bytes, cfg);
    },
    outputSuffix: "cropped",
  });

  const update = useCallback((patch: Partial<CropConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setValidationError(null);
  }, []);

  const updateMargin = useCallback(
    (side: "top" | "right" | "bottom" | "left", displayValue: number) => {
      const pts = toPoints(displayValue, unit);
      update({ [side]: pts });
    },
    [unit, update],
  );

  const displayValue = useCallback(
    (pts: number): number => {
      return unit === "mm" ? Math.round((pts / MM_TO_PT) * 10) / 10 : pts;
    },
    [unit],
  );

  const handleApply = useCallback(() => {
    if (!session.file) return;

    if (
      config.top < 0 ||
      config.right < 0 ||
      config.bottom < 0 ||
      config.left < 0
    ) {
      setValidationError("Margins must be non-negative.");
      return;
    }
    if (
      config.top === 0 &&
      config.right === 0 &&
      config.bottom === 0 &&
      config.left === 0
    ) {
      setValidationError("Enter at least one margin to crop.");
      return;
    }

    setValidationError(null);
    processor.run(session.file, config);
  }, [session.file, config, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setConfig(DEFAULT_CONFIG);
    setValidationError(null);
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
    config,
    unit,
    setUnit,
    update,
    updateMargin,
    displayValue,
    validationError,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
