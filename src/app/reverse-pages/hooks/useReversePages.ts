/**
 * useReversePages — hook for the Reverse Pages tool.
 * All pages or page range; Worker processing.
 * Requirements: 53.1, 53.2, 53.3
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { reversePages } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function useReversePages() {
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
  const [rangeError, setRangeError] = useState<string | null>(null);

  const processor = usePdfProcessor<{ pageRange: string; totalPages: number }>({
    processFn: async (bytes, { pageRange: range, totalPages }) => {
      return reversePages(bytes, range || undefined, totalPages);
    },
    outputSuffix: "reversed",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    setRangeError(null);
    processor.run(session.file, { pageRange, totalPages: session.pageCount });
  }, [session.file, session.pageCount, pageRange, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setPageRange("");
    setRangeError(null);
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
    rangeError,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
