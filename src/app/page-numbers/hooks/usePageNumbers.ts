/**
 * usePageNumbers — hook for the Page Numbering tool.
 * Position, format, font, starting number, page range; preview via CoordinateMapper.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { applyPageNumbers } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import type { PageNumberConfig } from "@/types/tool.types";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface PageNumbersConfig extends PageNumberConfig {
  startingNumber: number;
  pageRange: string;
}

const DEFAULT_CONFIG: PageNumbersConfig = {
  position: "bottom-center",
  format: "1",
  fontFamily: "Helvetica",
  fontSize: 10,
  color: "#000000",
  startingNumber: 1,
  pageRange: "",
};

export function usePageNumbers() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [config, setConfig] = useState<PageNumbersConfig>(DEFAULT_CONFIG);

  const processor = usePdfProcessor<PageNumbersConfig>({
    processFn: async (bytes, cfg, onProgress) => {
      return applyPageNumbers(bytes, cfg, onProgress);
    },
    outputSuffix: "numbered",
  });

  const update = useCallback((patch: Partial<PageNumbersConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApply = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, config);
  }, [session.file, config, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setConfig(DEFAULT_CONFIG);
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
    update,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
