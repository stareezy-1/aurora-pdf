/**
 * useRemoveAnnotations — hook for the Remove Annotations tool.
 * Per-page annotation count display, type filter checkboxes, Worker removal.
 *
 * Requirements: 34.1, 34.2, 34.3, 34.4
 */

import { useState, useCallback } from "react";
import { PDFDocument, PDFName } from "pdf-lib";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export type AnnotationType =
  | "Text"
  | "FreeText"
  | "Line"
  | "Square"
  | "Circle"
  | "Highlight"
  | "Underline"
  | "StrikeOut"
  | "Stamp"
  | "Ink"
  | "Link"
  | "Widget"
  | "Other";

export interface PageAnnotationInfo {
  pageIndex: number;
  total: number;
  byType: Record<string, number>;
}

const ANNOTATION_TYPES: AnnotationType[] = [
  "Text",
  "FreeText",
  "Line",
  "Square",
  "Circle",
  "Highlight",
  "Underline",
  "StrikeOut",
  "Stamp",
  "Ink",
  "Link",
  "Widget",
  "Other",
];

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

export function useRemoveAnnotations() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [pageInfo, setPageInfo] = useState<PageAnnotationInfo[]>([]);
  const [enabledTypes, setEnabledTypes] = useState<Set<AnnotationType>>(
    new Set(ANNOTATION_TYPES),
  );
  const [isPending, setIsPending] = useState(false);
  const [totalRemoved, setTotalRemoved] = useState(0);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  // Parse annotation counts from the loaded PDF
  const parseAnnotations = useCallback(async (bytes: Uint8Array) => {
    try {
      const pdfDoc = await PDFDocument.load(copyBytes(bytes), {
        ignoreEncryption: true,
      });
      const pages = pdfDoc.getPages();
      const info: PageAnnotationInfo[] = [];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const annots = page.node.get(PDFName.of("Annots"));
        const byType: Record<string, number> = {};
        let total = 0;

        if (annots) {
          // Try to get the annotations array
          try {
            const annotArray = pdfDoc.context.lookup(annots);
            if (annotArray && "array" in annotArray) {
              const arr = (annotArray as { array: unknown[] }).array;
              for (const ref of arr) {
                try {
                  const annotObj = pdfDoc.context.lookup(
                    ref as Parameters<typeof pdfDoc.context.lookup>[0],
                  );
                  if (annotObj && "get" in annotObj) {
                    const subtypeObj = (
                      annotObj as { get: (k: unknown) => unknown }
                    ).get(PDFName.of("Subtype"));
                    const subtype = subtypeObj
                      ? String(subtypeObj).replace("/", "")
                      : "Other";
                    byType[subtype] = (byType[subtype] ?? 0) + 1;
                    total++;
                  }
                } catch {
                  byType["Other"] = (byType["Other"] ?? 0) + 1;
                  total++;
                }
              }
            }
          } catch {
            // Fallback: just count as unknown
            byType["Other"] = 1;
            total = 1;
          }
        }

        if (total > 0) {
          info.push({ pageIndex: i, total, byType });
        }
      }

      setPageInfo(info);
    } catch {
      setPageInfo([]);
    }
  }, []);

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      session.handleDrop(files);
      if (files.length > 0) {
        const bytes = new Uint8Array(await files[0].arrayBuffer());
        await parseAnnotations(bytes);
      }
    },
    [session, parseAnnotations],
  );

  const toggleType = useCallback((type: AnnotationType) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setEnabledTypes(checked ? new Set(ANNOTATION_TYPES) : new Set());
  }, []);

  const totalAnnotations = pageInfo.reduce((sum, p) => sum + p.total, 0);

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setNewFile(session.file);
    updateProgress(0, "Loading PDF…");

    try {
      const pdfDoc = await PDFDocument.load(copyBytes(session.bytes), {
        ignoreEncryption: true,
      });
      const pages = pdfDoc.getPages();
      let removed = 0;

      for (let i = 0; i < pages.length; i++) {
        updateProgress(
          Math.round((i / pages.length) * 85),
          `Processing page ${i + 1} of ${pages.length}…`,
        );

        const page = pages[i];
        const annotsRef = page.node.get(PDFName.of("Annots"));
        if (!annotsRef) continue;

        try {
          const annotArray = pdfDoc.context.lookup(annotsRef);
          if (!annotArray || !("array" in annotArray)) continue;

          const arr = (annotArray as { array: unknown[] }).array;
          const keepRefs: unknown[] = [];

          for (const ref of arr) {
            try {
              const annotObj = pdfDoc.context.lookup(
                ref as Parameters<typeof pdfDoc.context.lookup>[0],
              );
              if (!annotObj || !("get" in annotObj)) {
                keepRefs.push(ref);
                continue;
              }

              const subtypeObj = (
                annotObj as { get: (k: unknown) => unknown }
              ).get(PDFName.of("Subtype"));
              const subtype = subtypeObj
                ? String(subtypeObj).replace("/", "")
                : "Other";

              const matchedType =
                ANNOTATION_TYPES.find((t) => t === subtype) ?? "Other";

              if (enabledTypes.has(matchedType)) {
                removed++;
              } else {
                keepRefs.push(ref);
              }
            } catch {
              keepRefs.push(ref);
            }
          }

          // Replace the Annots array with only the kept refs
          if (keepRefs.length === 0) {
            page.node.delete(PDFName.of("Annots"));
          } else {
            (annotArray as { array: unknown[] }).array = keepRefs;
          }
        } catch {
          // Skip pages that fail
        }
      }

      setTotalRemoved(removed);
      updateProgress(92, "Saving PDF…");
      const resultBytes = await pdfDoc.save();
      const blob = new Blob([resultBytes], { type: "application/pdf" });
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(blob, `${base}_no-annotations.pdf`);
    } catch (err) {
      failSession(
        err instanceof Error ? err.message : "Failed to remove annotations.",
      );
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    enabledTypes,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setPageInfo([]);
    setEnabledTypes(new Set(ANNOTATION_TYPES));
    setIsPending(false);
    setTotalRemoved(0);
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
    handleFileDrop,
    pageInfo,
    enabledTypes,
    toggleType,
    toggleAll,
    totalAnnotations,
    totalRemoved,
    isPending,
    handleApply,
    handleReset,
    ANNOTATION_TYPES,
    PDF_ACCEPT,
  };
}
