import { useState, useTransition, useRef, useCallback } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  renderThumbnail,
  renderPagePreview,
  deletePages,
  reorderPages,
  addTextAnnotation,
  getPageCount,
} from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { TextAnnotation } from "@/types/engine.types";

const MAX_SNAPSHOTS = 20;

export type Tool = "select" | "text" | "image" | "sign" | "watermark";

export interface Overlay {
  id: string;
  type: "text" | "image";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  dataUrl?: string;
}

/** A full snapshot of the editor state — pushed before every mutation */
interface Snapshot {
  pdfBytes: Uint8Array;
  thumbnails: string[];
  pagePreviews: string[];
  overlays: Overlay[];
  currentPage: number;
}

export function useEditPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    setComplete,
    failSession,
    updateProgress,
    clearWorkbox,
  } = useAuroraStore();

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pagePreviews, setPagePreviews] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // ── Snapshot-based undo stack ──────────────────────────────────────────────
  // Each entry is a full copy of the editor state before a mutation.
  // Undo pops the stack and restores the previous state.
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Text tool
  const [textInput, setTextInput] = useState("New text");
  const [textSize, setTextSize] = useState(18);
  const [textColor, setTextColor] = useState("#000000");
  const [textFont, setTextFont] = useState("Helvetica");

  // Image tool
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [pendingImgDataUrl, setPendingImgDataUrl] = useState<string | null>(
    null,
  );

  // Sign tool
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSignDrawing, setIsSignDrawing] = useState(false);
  const [signDataUrl, setSignDataUrl] = useState<string | null>(null);
  const [signTypedName, setSignTypedName] = useState("");

  // Watermark tool
  const [wmText, setWmText] = useState("CONFIDENTIAL");
  const [wmOpacity, setWmOpacity] = useState(30);
  const [wmColor, setWmColor] = useState("#888888");
  const [wmRotation, setWmRotation] = useState(45);

  // Overlay drag/resize refs
  const dragOverlayRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeOverlayRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Save current state to the undo stack before a mutation */
  function saveSnapshot(
    curBytes: Uint8Array,
    curThumbs: string[],
    curPreviews: string[],
    curOverlays: Overlay[],
    curPage: number,
  ) {
    setSnapshots((prev) => {
      const snap: Snapshot = {
        pdfBytes: new Uint8Array(curBytes), // copy so mutations don't affect it
        thumbnails: [...curThumbs],
        pagePreviews: [...curPreviews],
        overlays: curOverlays.map((o) => ({ ...o })),
        currentPage: curPage,
      };
      const next = [...prev, snap];
      return next.length > MAX_SNAPSHOTS
        ? next.slice(next.length - MAX_SNAPSHOTS)
        : next;
    });
  }

  // ── File load ──────────────────────────────────────────────────────────────

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    setOriginalFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
    setSnapshots([]);
    setOverlays([]);
    setSelectedId(null);
    setCurrentPage(0);
    startTransition(async () => {
      const n = await getPageCount(bytes);
      const thumbs: string[] = [];
      const previews: string[] = [];
      for (let i = 0; i < Math.min(n, 30); i++) {
        thumbs.push(await renderThumbnail(bytes, i));
        setThumbnails([...thumbs]);
        previews.push(await renderPagePreview(bytes, i));
        setPagePreviews([...previews]);
      }
    });
  }

  // ── Undo ───────────────────────────────────────────────────────────────────

  function handleUndo() {
    setSnapshots((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
      // Restore all state from snapshot
      setPdfBytes(snap.pdfBytes);
      setThumbnails(snap.thumbnails);
      setPagePreviews(snap.pagePreviews);
      setOverlays(snap.overlays);
      setCurrentPage(snap.currentPage);
      setSelectedId(null);
      return prev.slice(0, -1);
    });
  }

  // ── Page operations ────────────────────────────────────────────────────────

  async function confirmDelete(idx: number) {
    if (!pdfBytes) return;
    // Save snapshot BEFORE mutation
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);

    const newBytes = await deletePages(pdfBytes, [idx]);
    const newThumbs = thumbnails.filter((_, i) => i !== idx);
    const newPreviews = pagePreviews.filter((_, i) => i !== idx);
    const newOverlays = overlays
      .filter((o) => o.pageIndex !== idx)
      .map((o) => ({
        ...o,
        pageIndex: o.pageIndex > idx ? o.pageIndex - 1 : o.pageIndex,
      }));

    setPdfBytes(newBytes);
    setThumbnails(newThumbs);
    setPagePreviews(newPreviews);
    setOverlays(newOverlays);
    if (currentPage >= idx && currentPage > 0) setCurrentPage(currentPage - 1);
    setDeleteConfirm(null);
  }

  async function handleThumbDrop(targetIdx: number) {
    if (dragSrc === null || dragSrc === targetIdx || !pdfBytes) return;
    // Save snapshot BEFORE mutation
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);

    const order = thumbnails.map((_, i) => i);
    order.splice(dragSrc, 1);
    order.splice(targetIdx, 0, dragSrc);
    const newBytes = await reorderPages(pdfBytes, order);
    setPdfBytes(newBytes);
    setThumbnails(order.map((i) => thumbnails[i]));
    setPagePreviews(order.map((i) => pagePreviews[i]));
    setDragSrc(null);
    setDragOver(null);
  }

  // ── Canvas click — place overlay ───────────────────────────────────────────

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool === "select") {
      setSelectedId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = `${Date.now()}`;

    // Save snapshot before adding overlay
    if (pdfBytes)
      saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);

    if (activeTool === "text") {
      setOverlays((prev) => [
        ...prev,
        {
          id,
          type: "text",
          pageIndex: currentPage,
          x,
          y,
          width: 200,
          height: textSize + 8,
          text: textInput,
          fontSize: textSize,
          color: textColor,
          fontFamily: textFont,
        },
      ]);
      setSelectedId(id);
    } else if (activeTool === "image" && pendingImgDataUrl) {
      setOverlays((prev) => [
        ...prev,
        {
          id,
          type: "image",
          pageIndex: currentPage,
          x,
          y,
          width: 150,
          height: 100,
          dataUrl: pendingImgDataUrl,
        },
      ]);
      setSelectedId(id);
    } else if (activeTool === "sign" && signDataUrl) {
      setOverlays((prev) => [
        ...prev,
        {
          id,
          type: "image",
          pageIndex: currentPage,
          x,
          y,
          width: 180,
          height: 70,
          dataUrl: signDataUrl,
        },
      ]);
      setSelectedId(id);
    } else if (activeTool === "watermark") {
      setOverlays((prev) => [
        ...prev,
        {
          id,
          type: "text",
          pageIndex: currentPage,
          x: 80,
          y: 200,
          width: 300,
          height: 60,
          text: wmText,
          fontSize: 48,
          color: wmColor,
          fontFamily: "Helvetica",
        },
      ]);
      setSelectedId(id);
    }
  }

  // ── Overlay drag/resize ────────────────────────────────────────────────────

  const startOverlayDrag = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      dragOverlayRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: ov.x,
        origY: ov.y,
      };
      setSelectedId(id);
      const onMove = (ev: MouseEvent) => {
        if (!dragOverlayRef.current) return;
        const dx = ev.clientX - dragOverlayRef.current.startX;
        const dy = ev.clientY - dragOverlayRef.current.startY;
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  x: dragOverlayRef.current!.origX + dx,
                  y: dragOverlayRef.current!.origY + dy,
                }
              : o,
          ),
        );
      };
      const onUp = () => {
        dragOverlayRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [overlays],
  );

  const startOverlayResize = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      resizeOverlayRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origW: ov.width,
        origH: ov.height,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeOverlayRef.current) return;
        const dw = ev.clientX - resizeOverlayRef.current.startX;
        const dh = ev.clientY - resizeOverlayRef.current.startY;
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  width: Math.max(40, resizeOverlayRef.current!.origW + dw),
                  height: Math.max(20, resizeOverlayRef.current!.origH + dh),
                }
              : o,
          ),
        );
      };
      const onUp = () => {
        resizeOverlayRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [overlays],
  );

  function deleteOverlay(id: string) {
    // Save snapshot before deleting
    if (pdfBytes)
      saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    setSelectedId(null);
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!pdfBytes || !originalFile) return;
    updateProgress(0, "Applying edits…");
    try {
      let bytes = pdfBytes;
      const textOverlays = overlays.filter((o) => o.type === "text" && o.text);
      for (const ov of textOverlays) {
        const annotation: TextAnnotation = {
          pageIndex: ov.pageIndex,
          text: ov.text!,
          x: ov.x * 0.75,
          y: pagePreviews[ov.pageIndex] ? 842 - ov.y * 0.75 : 400,
          fontSize: ov.fontSize ?? 12,
          color: ov.color ?? "#000000",
        };
        bytes = await addTextAnnotation(bytes, annotation);
      }
      const blob = new Blob(
        [
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ),
        ] as any,
        { type: "application/pdf" } as any,
      );
      setComplete(blob, buildOutputFilename(originalFile.name, "edit"));
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Export failed.");
    }
  }

  function handleReset() {
    clearWorkbox();
    setPdfBytes(null);
    setThumbnails([]);
    setPagePreviews([]);
    setSnapshots([]);
    setOverlays([]);
    setOriginalFile(null);
    setCurrentPage(0);
  }

  // ── Sign canvas helpers ────────────────────────────────────────────────────

  function startSignDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = signCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsSignDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }
  function doSignDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isSignDrawing) return;
    const ctx = signCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  function endSignDraw() {
    setIsSignDrawing(false);
    setSignDataUrl(signCanvasRef.current?.toDataURL("image/png") ?? null);
  }
  function clearSignCanvas() {
    const ctx = signCanvasRef.current?.getContext("2d");
    if (ctx && signCanvasRef.current)
      ctx.clearRect(
        0,
        0,
        signCanvasRef.current.width,
        signCanvasRef.current.height,
      );
    setSignDataUrl(null);
  }
  function renderTypedSign() {
    const canvas = signCanvasRef.current;
    if (!canvas || !signTypedName) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "36px Georgia, serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(signTypedName, 10, 50);
    setSignDataUrl(canvas.toDataURL("image/png"));
  }

  const currentOverlays = overlays.filter((o) => o.pageIndex === currentPage);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pdfBytes,
    originalFile,
    thumbnails,
    pagePreviews,
    currentPage,
    setCurrentPage,
    snapshots,
    overlays,
    setOverlays,
    selectedId,
    setSelectedId,
    activeTool,
    setActiveTool,
    deleteConfirm,
    setDeleteConfirm,
    dragSrc,
    setDragSrc,
    dragOver,
    setDragOver,
    textInput,
    setTextInput,
    textSize,
    setTextSize,
    textColor,
    setTextColor,
    textFont,
    setTextFont,
    imgInputRef,
    pendingImgDataUrl,
    setPendingImgDataUrl,
    signCanvasRef,
    isSignDrawing,
    signDataUrl,
    setSignDataUrl,
    signTypedName,
    setSignTypedName,
    startSignDraw,
    doSignDraw,
    endSignDraw,
    clearSignCanvas,
    renderTypedSign,
    wmText,
    setWmText,
    wmOpacity,
    setWmOpacity,
    wmColor,
    setWmColor,
    wmRotation,
    setWmRotation,
    currentOverlays,
    handleFileDrop,
    confirmDelete,
    handleThumbDrop,
    handleCanvasClick,
    startOverlayDrag,
    startOverlayResize,
    deleteOverlay,
    handleExport,
    handleReset,
    handleUndo,
  };
}
