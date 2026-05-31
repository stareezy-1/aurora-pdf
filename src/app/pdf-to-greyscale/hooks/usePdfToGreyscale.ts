/**
 * usePdfToGreyscale — hook for the PDF to Greyscale tool.
 * Page range input, Worker conversion, PDF download.
 * Requirements: 50.1, 50.2, 50.3, 50.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { pdfToGreyscale } from "@/engines/conversion-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function usePdfToGreyscale() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [pageRange, setPageRange] = useState("");

  const processor = usePdfProcessor<{ pageRange: string; totalPages: number }>({
    processFn: async (bytes, { pageRange: range, totalPages }, onProgress) => {
      return pdfToGreyscale(bytes, range || undefined, totalPages, onProgress);
    },
    outputSuffix: "greyscale",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, { pageRange, totalPages: session.pageCount });
  }, [session.file, session.pageCount, pageRange, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setPageRange("");
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
    pageRange,
    setPageRange,
    isPending: processor.isPending,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
