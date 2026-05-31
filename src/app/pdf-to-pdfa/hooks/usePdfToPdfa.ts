/**
 * usePdfToPdfa — hook for the PDF to PDF/A tool.
 * PDF/A variant selector (1b/2b), Worker conversion.
 * Requirements: 62.1, 62.2, 62.3, 62.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { pdfToPdfa } from "@/engines/conversion-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function usePdfToPdfa() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [variant, setVariant] = useState<"1b" | "2b">("1b");

  const processor = usePdfProcessor<{ variant: "1b" | "2b" }>({
    processFn: async (bytes, { variant: v }, onProgress) => {
      return pdfToPdfa(bytes, v, onProgress);
    },
    outputSuffix: "pdfa",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, { variant });
  }, [session.file, variant, processor]);

  const handleReset = useCallback(() => {
    session.reset();
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
    variant,
    setVariant,
    isPending: processor.isPending,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
