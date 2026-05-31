/**
 * useExtractPages — hook for the Extract Pages tool.
 * Page range input with preview of selected pages, validation error on out-of-bounds.
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState, useCallback, useMemo } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { extractPageRange } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import { parseRange } from "@/lib/range-parser";
import { InvalidPageRangeError, PageRangeOutOfBoundsError } from "@/lib/errors";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function useExtractPages() {
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
      return extractPageRange(bytes, range, totalPages);
    },
    outputSuffix: "extracted",
  });

  // Validate range and compute selected page indices for preview
  const selectedPages = useMemo(() => {
    if (!pageRange.trim() || !session.pageCount) return [];
    try {
      const indices = parseRange(pageRange, session.pageCount);
      setRangeError(null);
      return indices;
    } catch (err) {
      if (
        err instanceof PageRangeOutOfBoundsError ||
        err instanceof InvalidPageRangeError
      ) {
        setRangeError(err.message);
      }
      return [];
    }
  }, [pageRange, session.pageCount]);

  const handleRangeChange = useCallback((value: string) => {
    setPageRange(value);
    setRangeError(null);
  }, []);

  const handleExtract = useCallback(() => {
    if (!session.file || !session.pageCount) return;
    if (!pageRange.trim()) {
      setRangeError("Please enter a page range (e.g. 1-3,5).");
      return;
    }
    try {
      parseRange(pageRange, session.pageCount);
      setRangeError(null);
      processor.run(session.file, { pageRange, totalPages: session.pageCount });
    } catch (err) {
      setRangeError(err instanceof Error ? err.message : "Invalid page range.");
    }
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
    handleRangeChange,
    rangeError,
    selectedPages,
    handleExtract,
    handleReset,
    PDF_ACCEPT,
  };
}
