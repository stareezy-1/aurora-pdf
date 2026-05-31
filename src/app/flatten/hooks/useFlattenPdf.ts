/**
 * useFlattenPdf — hook for the Flatten PDF tool.
 * Flatten form fields + annotations, display flattened count, Worker processing.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { PDFDocument, PDFName, PDFArray, PDFDict } from "pdf-lib";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

interface FlattenResult {
  bytes: Uint8Array;
  fieldsFlattened: number;
  annotationsFlattened: number;
}

async function flattenPdf(
  bytes: Uint8Array,
  onProgress: (pct: number, label?: string) => void,
): Promise<FlattenResult> {
  onProgress(10, "Loading PDF…");

  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  onProgress(30, "Counting form fields and annotations…");

  let fieldsFlattened = 0;
  let annotationsFlattened = 0;

  // ── 1. Remove AcroForm (flattens all interactive form fields) ─────────────
  const catalog = pdfDoc.catalog;
  const acroFormRef = catalog.get(PDFName.of("AcroForm"));
  if (acroFormRef) {
    try {
      const acroForm = pdfDoc.context.lookup(acroFormRef);
      if (acroForm instanceof PDFDict) {
        const fieldsRef = acroForm.get(PDFName.of("Fields"));
        if (fieldsRef) {
          const fields = pdfDoc.context.lookup(fieldsRef);
          if (fields instanceof PDFArray) {
            fieldsFlattened = fields.size();
          }
        }
      }
    } catch {
      fieldsFlattened = 1; // at least one existed
    }
    catalog.delete(PDFName.of("AcroForm"));
  }

  onProgress(55, "Removing annotations…");

  // ── 2. Remove /Annots from all pages (flattens annotations) ──────────────
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const pageDict = page.node;
    const annotsRef = pageDict.get(PDFName.of("Annots"));
    if (annotsRef) {
      try {
        const annots = pdfDoc.context.lookup(annotsRef);
        if (annots instanceof PDFArray) {
          annotationsFlattened += annots.size();
        }
      } catch {
        annotationsFlattened += 1;
      }
      pageDict.delete(PDFName.of("Annots"));
    }
  }

  onProgress(80, "Saving flattened PDF…");
  const result = await pdfDoc.save({ useObjectStreams: false });
  onProgress(100, "Done");

  return { bytes: result, fieldsFlattened, annotationsFlattened };
}

export function useFlattenPdf() {
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
  const [flattenStats, setFlattenStats] = useState<{
    fields: number;
    annotations: number;
  } | null>(null);

  const processor = usePdfProcessor<Record<string, never>>({
    processFn: async (bytes, _config, onProgress) => {
      const result = await flattenPdf(bytes, onProgress);
      setFlattenStats({
        fields: result.fieldsFlattened,
        annotations: result.annotationsFlattened,
      });
      return result.bytes;
    },
    outputSuffix: "flattened",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    setFlattenStats(null);
    processor.run(session.file, {});
  }, [session.file, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setFlattenStats(null);
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
    flattenStats,
    processor,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
