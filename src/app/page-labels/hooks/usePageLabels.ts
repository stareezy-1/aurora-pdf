/**
 * usePageLabels — hook for the Add Page Labels tool.
 * Label range definitions (style + prefix), preview, Worker export.
 * Requirements: 38.1, 38.2, 38.3, 38.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import {
  applyPageLabels,
  type PageLabelRange,
  type PageLabelStyle,
} from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export const LABEL_STYLES: { value: PageLabelStyle; label: string }[] = [
  { value: "arabic", label: "Arabic (1, 2, 3…)" },
  { value: "roman-upper", label: "Roman Upper (I, II, III…)" },
  { value: "roman-lower", label: "Roman Lower (i, ii, iii…)" },
  { value: "alpha-upper", label: "Alpha Upper (A, B, C…)" },
  { value: "alpha-lower", label: "Alpha Lower (a, b, c…)" },
  { value: "none", label: "None (prefix only)" },
];

export function usePageLabels() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  const [ranges, setRanges] = useState<PageLabelRange[]>([
    { startPage: 0, style: "arabic", prefix: "", startAt: 1 },
  ]);

  const processor = usePdfProcessor<PageLabelRange[]>({
    processFn: async (bytes, labelRanges) => {
      return applyPageLabels(bytes, labelRanges);
    },
    outputSuffix: "labeled",
  });

  const addRange = useCallback(() => {
    setRanges((prev) => [
      ...prev,
      {
        startPage: prev.length > 0 ? prev[prev.length - 1].startPage + 1 : 0,
        style: "arabic",
        prefix: "",
        startAt: 1,
      },
    ]);
  }, []);

  const updateRange = useCallback(
    (idx: number, patch: Partial<PageLabelRange>) => {
      setRanges((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const deleteRange = useCallback((idx: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleApply = useCallback(() => {
    if (!session.file || ranges.length === 0) return;
    processor.run(session.file, ranges);
  }, [session.file, ranges, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setRanges([{ startPage: 0, style: "arabic", prefix: "", startAt: 1 }]);
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
    ranges,
    addRange,
    updateRange,
    deleteRange,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
