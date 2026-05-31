/**
 * useSignPdf — upgraded hook for the Sign PDF tool.
 *
 * Changes from the original:
 * - Uses useFileSession + usePdfProcessor instead of useFileProcessor
 * - Supports multiple signature overlays (array of SigOverlay)
 * - Each overlay has pageIndex, opacity (10–100), rotation (0–360°), and id
 * - Loads saved signatures from signature-manager on mount
 * - Saves new signatures to localStorage after successful apply
 * - Supports 6+ fonts from SIGNATURE_FONTS in signature-manager
 * - Export applies all overlays in a single pass via applySignatures
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { mapOverlayToPdf } from "@/lib/coordinate-mapper";
import {
  SIGNATURE_FONTS,
  SIGNATURE_FONTS_URL,
  loadSavedSignatures,
  saveSignature,
  deleteSignature,
  renameSignature,
  applySignatures,
} from "@/engines/signature-manager";
import { buildOutputFilename } from "@/lib/filename-utils";
import { SignatureImageTooLargeError } from "@/lib/errors";
import type { SignatureMethod, SavedSignature } from "@/types/tool.types";

export { SIGNATURE_FONTS, SIGNATURE_FONTS_URL };
export type SignatureFont = (typeof SIGNATURE_FONTS)[number];

const MAX_SIG_MB = 5;

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

/** Extended overlay — each placed signature on the canvas. */
export interface SigOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  opacity: number; // 10–100
  rotation: number; // 0–360
  dataUrl: string;
}

function generateId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useSignPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  // ── File session ──────────────────────────────────────────────────────────
  const session = useFileSession({
    accept: PDF_ACCEPT,
    generateAllPreviews: true,
  });

  // ── Signature creation state ──────────────────────────────────────────────
  const [method, setMethod] = useState<SignatureMethod>("draw");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [typedSigFont, setTypedSigFont] = useState<SignatureFont>(
    SIGNATURE_FONTS[0],
  );
  const [typedSigSize] = useState(38);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // ── Page navigation ───────────────────────────────────────────────────────
  const [pageIndex, setPageIndex] = useState(0);

  // ── Multiple overlays ─────────────────────────────────────────────────────
  const [overlays, setOverlays] = useState<SigOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );

  // Per-overlay drag/resize origin refs (keyed by overlay id)
  const overlayDragOriginRef = useRef<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const overlayResizeOriginRef = useRef<{
    id: string;
    w: number;
    h: number;
  } | null>(null);

  // ── Saved signatures ──────────────────────────────────────────────────────
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>(() =>
    loadSavedSignatures(),
  );

  // Reload saved signatures from localStorage whenever the component mounts
  useEffect(() => {
    setSavedSignatures(loadSavedSignatures());
  }, []);

  // ── Processor ─────────────────────────────────────────────────────────────
  const processor = usePdfProcessor<{ overlays: SigOverlay[] }>({
    processFn: async (bytes, config, onProgress) => {
      if (config.overlays.length === 0) {
        throw new Error(
          "No signatures placed. Please place at least one signature before applying.",
        );
      }

      // Convert each overlay to a SignaturePlacement using CoordinateMapper
      const previewImgs = document.querySelectorAll<HTMLImageElement>(
        ".editor-page-wrap img",
      );

      const placements = config.overlays.map((ov) => {
        // Find the preview image for this overlay's page
        const imgEl = previewImgs[ov.pageIndex] ?? previewImgs[0];
        const pageDim = session.pageDimensions[ov.pageIndex] ?? {
          width: 595,
          height: 842,
        };

        let pdfRect = { x: 0, y: 0, width: 100, height: 40 };

        if (imgEl && imgEl.naturalWidth > 0) {
          pdfRect = mapOverlayToPdf({
            overlay: { x: ov.x, y: ov.y, width: ov.width, height: ov.height },
            pageIndex: ov.pageIndex,
            zoom: 1,
            containerEl: imgEl,
            pageDimensions: pageDim,
          });
        }

        return {
          dataUrl: ov.dataUrl,
          pageIndex: ov.pageIndex,
          x: pdfRect.x,
          y: pdfRect.y,
          width: pdfRect.width,
          height: pdfRect.height,
          opacity: ov.opacity,
          rotation: ov.rotation,
        };
      });

      const result = await applySignatures(bytes, placements, onProgress);

      // Persist each unique dataUrl as a saved signature
      const uniqueDataUrls = [
        ...new Set(config.overlays.map((o) => o.dataUrl)),
      ];
      for (const dataUrl of uniqueDataUrls) {
        const existing = loadSavedSignatures().find(
          (s) => s.dataUrl === dataUrl,
        );
        if (!existing) {
          const newSig: SavedSignature = {
            id: generateId(),
            name: `Signature ${new Date().toLocaleDateString()}`,
            dataUrl,
            createdAt: Date.now(),
          };
          saveSignature(newSig);
        }
      }
      setSavedSignatures(loadSavedSignatures());

      return result;
    },
    outputSuffix: "signed",
  });

  // ── Drawing handlers ──────────────────────────────────────────────────────

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function endDraw() {
    setIsDrawing(false);
    setSigDataUrl(canvasRef.current?.toDataURL("image/png") ?? null);
  }

  function renderTypedSig() {
    const canvas = canvasRef.current;
    if (!canvas || !typedName) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${typedSigSize}px "${typedSigFont}", cursive`;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(typedName, 12, 56);
    setSigDataUrl(canvas.toDataURL("image/png"));
  }

  // Re-render typed signature when font or name changes
  useEffect(() => {
    if (method === "type" && typedName) {
      const timer = setTimeout(renderTypedSig, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedSigFont, typedName, method]);

  function handleSigImageDrop(files: File[]) {
    const file = files[0];
    if (file.size > MAX_SIG_MB * 1024 * 1024) {
      useAuroraStore
        .getState()
        .failSession(new SignatureImageTooLargeError().message);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setSigDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current)
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSigDataUrl(null);
  }

  // ── Place signature as overlay ────────────────────────────────────────────

  /** Add the current sigDataUrl as a new overlay on the current page. */
  function placeSignature() {
    if (!sigDataUrl) return;
    const newOverlay: SigOverlay = {
      id: generateId(),
      x: 60,
      y: 400,
      width: 200,
      height: 80,
      pageIndex,
      opacity: 100,
      rotation: 0,
      dataUrl: sigDataUrl,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  }

  /** Load a saved signature as the active sigDataUrl. */
  function loadSavedSig(sig: SavedSignature) {
    setSigDataUrl(sig.dataUrl);
  }

  /** Remove an overlay by id. */
  function removeOverlay(id: string) {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  }

  /** Update opacity for a specific overlay. */
  function setOverlayOpacity(id: string, opacity: number) {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, opacity } : o)),
    );
  }

  /** Update rotation for a specific overlay. */
  function setOverlayRotation(id: string, rotation: number) {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, rotation } : o)),
    );
  }

  // ── Overlay drag ──────────────────────────────────────────────────────────

  const beginOverlayDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent, id: string) => {
      e.stopPropagation();
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      overlayDragOriginRef.current = { id, x: ov.x, y: ov.y };
      setSelectedOverlayId(id);
    },
    [overlays],
  );

  const moveOverlayDrag = useCallback((delta: { dx: number; dy: number }) => {
    if (!overlayDragOriginRef.current) return;
    const { id, x, y } = overlayDragOriginRef.current;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, x: x + delta.dx, y: y + delta.dy } : o,
      ),
    );
  }, []);

  const endOverlayDrag = useCallback(() => {
    overlayDragOriginRef.current = null;
  }, []);

  // ── Overlay resize ────────────────────────────────────────────────────────

  const beginOverlayResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent, id: string) => {
      e.stopPropagation();
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      overlayResizeOriginRef.current = { id, w: ov.width, h: ov.height };
    },
    [overlays],
  );

  const moveOverlayResize = useCallback((delta: { dx: number; dy: number }) => {
    if (!overlayResizeOriginRef.current) return;
    const { id, w, h } = overlayResizeOriginRef.current;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              width: Math.max(60, w + delta.dx),
              height: Math.max(30, h + delta.dy),
            }
          : o,
      ),
    );
  }, []);

  const endOverlayResize = useCallback(() => {
    overlayResizeOriginRef.current = null;
  }, []);

  // ── Saved signature management ────────────────────────────────────────────

  function handleDeleteSavedSig(id: string) {
    deleteSignature(id);
    setSavedSignatures(loadSavedSignatures());
  }

  function handleRenameSavedSig(id: string, name: string) {
    renameSignature(id, name);
    setSavedSignatures(loadSavedSignatures());
  }

  // ── Apply / reset ─────────────────────────────────────────────────────────

  function handleApply() {
    if (!session.file || !session.bytes) return;
    if (overlays.length === 0) {
      useAuroraStore
        .getState()
        .failSession(
          "No signatures placed. Please place at least one signature before applying.",
        );
      return;
    }
    processor.run(session.file, { overlays });
  }

  function handleReset() {
    session.reset();
    setOverlays([]);
    setSelectedOverlayId(null);
    setSigDataUrl(null);
    setTypedName("");
    clearCanvas();
  }

  // ── Derived helpers ───────────────────────────────────────────────────────

  /** Overlays visible on the currently displayed page. */
  const currentPageOverlays = overlays.filter((o) => o.pageIndex === pageIndex);

  const selectedOverlay =
    overlays.find((o) => o.id === selectedOverlayId) ?? null;

  return {
    // Store state
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,

    // File session
    pdfFile: session.file,
    pageCount: session.pageCount,
    pagePreviews: session.allPreviews,
    pageDimensions: session.pageDimensions,
    isLoading: session.isLoading,
    handlePdfDrop: session.handleDrop,

    // Page navigation
    pageIndex,
    setPageIndex,

    // Signature creation
    method,
    setMethod,
    sigDataUrl,
    setSigDataUrl,
    typedName,
    setTypedName,
    typedSigFont,
    setTypedSigFont,
    typedSigSize,
    canvasRef,
    isDrawing,
    startDraw,
    draw,
    endDraw,
    renderTypedSig,
    handleSigImageDrop,
    clearCanvas,

    // Overlays
    overlays,
    currentPageOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    selectedOverlay,
    placeSignature,
    removeOverlay,
    setOverlayOpacity,
    setOverlayRotation,
    beginOverlayDrag,
    moveOverlayDrag,
    endOverlayDrag,
    beginOverlayResize,
    moveOverlayResize,
    endOverlayResize,

    // Saved signatures
    savedSignatures,
    loadSavedSig,
    handleDeleteSavedSig,
    handleRenameSavedSig,

    // Apply / reset
    processor,
    handleApply,
    handleReset,

    MAX_SIG_MB,
  };
}
