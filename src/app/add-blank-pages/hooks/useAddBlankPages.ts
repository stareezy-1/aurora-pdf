/**
 * useAddBlankPages — hook for the Add Blank Pages tool.
 * Insert position, page size, orientation; Worker processing.
 * Requirements: 14.1, 14.2, 14.3
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { insertBlankPage } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface BlankPageConfig {
  position: number;
  pageSize: "A4" | "Letter" | "Legal";
  orientation: "portrait" | "landscape";
}

export function useAddBlankPages() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  const [config, setConfig] = useState<BlankPageConfig>({
    position: 0,
    pageSize: "A4",
    orientation: "portrait",
  });

  const processor = usePdfProcessor<BlankPageConfig>({
    processFn: async (bytes, cfg) => {
      return insertBlankPage(
        bytes,
        cfg.position,
        cfg.pageSize,
        cfg.orientation,
      );
    },
    outputSuffix: "blank-added",
  });

  const update = useCallback((patch: Partial<BlankPageConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApply = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, config);
  }, [session.file, config, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setConfig({ position: 0, pageSize: "A4", orientation: "portrait" });
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
