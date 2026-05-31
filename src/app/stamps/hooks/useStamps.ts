/**
 * useStamps — hook for the Add Stamps tool.
 * Built-in stamp set, custom PNG/SVG upload, overlay handles via CoordinateMapper,
 * Worker embed via edit-engine applyEdits.
 *
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5
 */

import { useState, useCallback, useRef } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";
import { applyEdits, createImageAction } from "@/engines/edit-engine";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export type BuiltInStamp =
  | "DRAFT"
  | "APPROVED"
  | "CONFIDENTIAL"
  | "REJECTED"
  | "FOR REVIEW";

export interface StampPlacement {
  id: string;
  pageIndex: number;
  /** CSS pixels from left of preview */
  x: number;
  /** CSS pixels from top of preview */
  y: number;
  width: number;
  height: number;
  opacity: number; // 10–100
  rotation: number; // 0–360
  dataUrl: string;
  label: string;
}

const BUILT_IN_STAMPS: Array<{
  id: BuiltInStamp;
  label: string;
  color: string;
  bg: string;
}> = [
  { id: "DRAFT", label: "DRAFT", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  {
    id: "APPROVED",
    label: "APPROVED",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
  },
  {
    id: "CONFIDENTIAL",
    label: "CONFIDENTIAL",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.1)",
  },
  {
    id: "REJECTED",
    label: "REJECTED",
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
  },
  {
    id: "FOR REVIEW",
    label: "FOR REVIEW",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.1)",
  },
];

let _counter = 0;
function nextId(): string {
  return `stamp-${Date.now()}-${++_counter}`;
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

/** Render a built-in stamp as a PNG data URL using canvas */
function renderBuiltInStamp(
  label: string,
  color: string,
  width = 200,
  height = 60,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.clearRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Text
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(height * 0.45)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.85;
  ctx.fillText(label, width / 2, height / 2);

  return canvas.toDataURL("image/png");
}

export function useStamps() {
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

  const [placements, setPlacements] = useState<StampPlacement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const previewRef = useRef<HTMLImageElement | null>(null);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const addBuiltInStamp = useCallback(
    (stamp: (typeof BUILT_IN_STAMPS)[number]) => {
      const dataUrl = renderBuiltInStamp(stamp.label, stamp.color);
      const id = nextId();
      const placement: StampPlacement = {
        id,
        pageIndex: currentPage,
        x: 50,
        y: 50,
        width: 200,
        height: 60,
        opacity: 80,
        rotation: 0,
        dataUrl,
        label: stamp.label,
      };
      setPlacements((prev) => [...prev, placement]);
      setSelectedId(id);
    },
    [currentPage],
  );

  const addCustomStamp = useCallback(
    async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const id = nextId();
      const placement: StampPlacement = {
        id,
        pageIndex: currentPage,
        x: 50,
        y: 50,
        width: 200,
        height: 80,
        opacity: 80,
        rotation: 0,
        dataUrl,
        label: file.name,
      };
      setPlacements((prev) => [...prev, placement]);
      setSelectedId(id);
    },
    [currentPage],
  );

  const updatePlacement = useCallback(
    (id: string, updates: Partial<StampPlacement>) => {
      setPlacements((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  const removePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const selectedPlacement = placements.find((p) => p.id === selectedId) ?? null;

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    if (placements.length === 0) {
      failSession("No stamps placed. Add at least one stamp first.");
      return;
    }
    setIsPending(true);
    setNewFile(session.file);
    updateProgress(0, "Loading PDF…");

    try {
      const imgEl = previewRef.current;
      const imgW = imgEl?.clientWidth ?? 600;
      const imgH = imgEl?.clientHeight ?? 800;

      // Get page dimensions for coordinate mapping
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(copyBytes(session.bytes));
      const pages = pdfDoc.getPages();
      const pageDims = pages.map((p) => p.getSize());

      // Build edit actions for each placement
      const actions = placements.map((p) => {
        const pageIdx = Math.min(p.pageIndex, pages.length - 1);
        const dim = pageDims[pageIdx];

        const scaleX = dim.width / imgW;
        const scaleY = dim.height / imgH;
        const pdfX = p.x * scaleX;
        const pdfY = dim.height - (p.y + p.height) * scaleY;
        const pdfW = p.width * scaleX;
        const pdfH = p.height * scaleY;

        return createImageAction({
          pageIndex: pageIdx,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          dataUrl: p.dataUrl,
          opacity: p.opacity,
          rotation: p.rotation,
        });
      });

      updateProgress(20, "Embedding stamps…");

      const resultBytes = await applyEdits(
        session.bytes,
        actions,
        (pct, label) => updateProgress(20 + Math.round(pct * 0.7), label),
      );

      const blob = new Blob([resultBytes], { type: "application/pdf" });
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(blob, `${base}_stamped.pdf`);
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Failed to add stamps.");
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    placements,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setPlacements([]);
    setSelectedId(null);
    setIsPending(false);
    setCurrentPage(0);
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
    placements,
    selectedPlacement,
    selectedId,
    setSelectedId,
    addBuiltInStamp,
    addCustomStamp,
    updatePlacement,
    removePlacement,
    currentPage,
    setCurrentPage,
    isPending,
    handleApply,
    handleReset,
    previewRef,
    BUILT_IN_STAMPS,
    PDF_ACCEPT,
  };
}
