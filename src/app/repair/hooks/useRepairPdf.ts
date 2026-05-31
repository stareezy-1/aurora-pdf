/**
 * useRepairPdf — hook for the Repair PDF tool.
 * Worker-based parse-and-reconstruct, display recovered/lost page counts.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { PDFDocument } from "pdf-lib";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

async function repairPdf(
  bytes: Uint8Array,
  _config: Record<string, never>,
  onProgress: (pct: number, label?: string) => void,
): Promise<Uint8Array> {
  onProgress(10, "Loading PDF…");

  // Load with ignoreEncryption to handle encrypted/corrupted files
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      // Attempt to recover as much as possible
    });
  } catch (err) {
    throw new Error(
      `Could not parse the PDF. The file may be too corrupted to repair. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  onProgress(50, "Reconstructing PDF structure…");

  // Re-save the document — pdf-lib will rebuild the cross-reference table
  // and object structure, effectively repairing structural issues.
  const repairedBytes = await pdfDoc.save({ useObjectStreams: false });

  onProgress(100, "Done");
  return repairedBytes;
}

export function useRepairPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT });
  const [repairedPageCount, setRepairedPageCount] = useState<number | null>(
    null,
  );

  const processor = usePdfProcessor<Record<string, never>>({
    processFn: async (bytes, config, onProgress) => {
      const result = await repairPdf(bytes, config, onProgress);
      // Count pages in repaired output
      try {
        const doc = await PDFDocument.load(result, { ignoreEncryption: true });
        setRepairedPageCount(doc.getPageCount());
      } catch {
        setRepairedPageCount(null);
      }
      return result;
    },
    outputSuffix: "repaired",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    setRepairedPageCount(null);
    processor.run(session.file, {});
  }, [session.file, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setRepairedPageCount(null);
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    file: session.file,
    pageCount: session.pageCount,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    repairedPageCount,
    processor,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
