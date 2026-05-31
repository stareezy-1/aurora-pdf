/**
 * useRotatePdf — hook for the Rotate PDF tool.
 * Per-page and all-pages rotation (90/180/270), real-time thumbnail update.
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { useState, useCallback, useEffect } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { rotatePageRange } from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export type RotationDegrees = 90 | 180 | 270;

export interface PageRotation {
  pageIndex: number;
  degrees: RotationDegrees;
}

export function useRotatePdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({
    accept: PDF_ACCEPT,
    generateAllPreviews: true,
  });

  // Per-page rotation state (cumulative, mod 360)
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [allRotation, setAllRotation] = useState<RotationDegrees>(90);

  // Reset rotations when file changes
  useEffect(() => {
    setRotations({});
  }, [session.file]);

  const processor = usePdfProcessor<PageRotation[]>({
    processFn: async (bytes, pageRotations) => {
      return rotatePageRange(bytes, pageRotations, session.pageCount);
    },
    outputSuffix: "rotated",
  });

  const rotatePage = useCallback((pageIndex: number, deg: RotationDegrees) => {
    setRotations((prev) => {
      const current = prev[pageIndex] ?? 0;
      const next = (current + deg) % 360;
      return { ...prev, [pageIndex]: next };
    });
  }, []);

  const rotateAll = useCallback(
    (deg: RotationDegrees) => {
      setRotations((prev) => {
        const next: Record<number, number> = {};
        for (let i = 0; i < session.pageCount; i++) {
          next[i] = ((prev[i] ?? 0) + deg) % 360;
        }
        return next;
      });
    },
    [session.pageCount],
  );

  const resetRotations = useCallback(() => {
    setRotations({});
  }, []);

  const handleApply = useCallback(() => {
    if (!session.file) return;
    const pageRotations: PageRotation[] = Object.entries(rotations)
      .filter(([, deg]) => deg !== 0)
      .map(([idx, deg]) => ({
        pageIndex: parseInt(idx, 10),
        degrees: deg as RotationDegrees,
      }));
    if (pageRotations.length === 0) return;
    processor.run(session.file, pageRotations);
  }, [session.file, rotations, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setRotations({});
  }, [session]);

  const hasChanges = Object.values(rotations).some((d) => d !== 0);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file: session.file,
    pageCount: session.pageCount,
    allPreviews: session.allPreviews,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    rotations,
    allRotation,
    setAllRotation,
    rotatePage,
    rotateAll,
    resetRotations,
    hasChanges,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
