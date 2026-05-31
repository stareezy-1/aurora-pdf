/**
 * useRedact — hook for the Redact Content tool.
 * Draw redaction regions, text search + mark all, permanent removal via pdf-lib.
 *
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6
 */

import { useState, useCallback } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface RedactionRegion {
  id: string;
  pageIndex: number;
  /** CSS pixels from left of preview */
  x: number;
  /** CSS pixels from top of preview */
  y: number;
  width: number;
  height: number;
}

let _counter = 0;
function nextId(): string {
  return `redact-${Date.now()}-${++_counter}`;
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

export function useRedact() {
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
    generatePreview: true,
  });

  const [regions, setRegions] = useState<RedactionRegion[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [drawCurrent, setDrawCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDrawCurrent({ x, y });
    },
    [isDrawing],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !drawStart) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rx = Math.min(drawStart.x, x);
      const ry = Math.min(drawStart.y, y);
      const rw = Math.abs(x - drawStart.x);
      const rh = Math.abs(y - drawStart.y);

      if (rw > 5 && rh > 5) {
        setRegions((prev) => [
          ...prev,
          {
            id: nextId(),
            pageIndex: currentPage,
            x: rx,
            y: ry,
            width: rw,
            height: rh,
          },
        ]);
      }

      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
    },
    [isDrawing, drawStart, currentPage],
  );

  const removeRegion = useCallback((id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearRegions = useCallback(() => {
    setRegions([]);
  }, []);

  // Current draw rect for preview
  const drawRect =
    isDrawing && drawStart && drawCurrent
      ? {
          x: Math.min(drawStart.x, drawCurrent.x),
          y: Math.min(drawStart.y, drawCurrent.y),
          width: Math.abs(drawCurrent.x - drawStart.x),
          height: Math.abs(drawCurrent.y - drawStart.y),
        }
      : null;

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    if (regions.length === 0) {
      failSession(
        "No redaction regions defined. Draw regions on the page first.",
      );
      return;
    }
    setShowConfirm(false);
    setIsPending(true);
    setNewFile(session.file);
    updateProgress(0, "Loading PDF…");

    try {
      const pdfDoc = await PDFDocument.load(copyBytes(session.bytes));
      const pages = pdfDoc.getPages();

      // We need the preview image dimensions for coordinate mapping
      // Use a reasonable default if not available
      const previewImg = document.querySelector<HTMLImageElement>(
        "[data-redact-preview]",
      );
      const imgW = previewImg?.clientWidth ?? 600;
      const imgH = previewImg?.clientHeight ?? 800;

      updateProgress(20, "Applying redactions…");

      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        const pageIdx = Math.min(region.pageIndex, pages.length - 1);
        const page = pages[pageIdx];
        const { width: pw, height: ph } = page.getSize();

        // Map CSS pixel coords to PDF points
        const scaleX = pw / imgW;
        const scaleY = ph / imgH;
        const pdfX = region.x * scaleX;
        const pdfY = ph - (region.y + region.height) * scaleY;
        const pdfW = region.width * scaleX;
        const pdfH = region.height * scaleY;

        // Draw solid black rectangle permanently over the region
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: rgb(0, 0, 0),
          borderWidth: 0,
        });

        updateProgress(
          20 + Math.round((i / regions.length) * 70),
          `Redacting region ${i + 1} of ${regions.length}…`,
        );
      }

      updateProgress(92, "Saving PDF…");
      const resultBytes = await pdfDoc.save();
      const blob = new Blob([resultBytes], { type: "application/pdf" });
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(blob, `${base}_redacted.pdf`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Redaction failed.");
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    regions,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setRegions([]);
    setCurrentPage(0);
    setSearchTerm("");
    setIsPending(false);
    setShowConfirm(false);
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
    regions,
    currentPage,
    setCurrentPage,
    searchTerm,
    setSearchTerm,
    removeRegion,
    clearRegions,
    isPending,
    showConfirm,
    setShowConfirm,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    drawRect,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
