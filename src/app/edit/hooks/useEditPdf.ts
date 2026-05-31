import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  renderThumbnail,
  renderPagePreview,
  deletePages,
  reorderPages,
  addTextAnnotation,
  getPageCount,
  getPageSizes,
  applyDrawOverlay,
  applyShapeOverlay,
  applyPageNumbers,
  applyWatermark,
  embedImageOverlay,
} from "@/engines/pdf-engine";
import { applyEdits } from "@/engines/edit-engine";
import { recognizeWithBoundingBoxes } from "@/engines/ocr-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { TextAnnotation, ShapeAnnotation } from "@/types/engine.types";
import type { PageNumberPosition, PageNumberFormat } from "@/types/tool.types";

const MAX_SNAPSHOTS = 5; // Keep low to limit memory — each snapshot = full PDF copy
const MAX_OVERLAY_UNDO = 20; // Max overlay-only undo steps

export type Tool =
  | "select"
  | "text"
  | "image"
  | "sign"
  | "watermark"
  | "draw"
  | "shape"
  | "ocr-edit"
  | "page-numbers"
  | "highlight"
  | "underline"
  | "strikethrough"
  | "note";

export interface Overlay {
  id: string;
  type: "text" | "image" | "annotation" | "note";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  rotation?: number; // degrees — used by watermark overlays
  opacity?: number; // 0–100 — used by watermark overlays
  dataUrl?: string;
  // annotation-specific
  annotationType?: "highlight" | "underline" | "strikethrough";
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
    undoStack,
    redoStack,
    pushUndo,
    pushRedo,
    clearUndoRedo,
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

  // ── Overlay-only undo/redo stacks ─────────────────────────────────────────
  // These ref stacks hold snapshots of the overlays array only (not the full
  // PDF state). They are synced with the Zustand store's undoStack/redoStack
  // so the toolbar buttons can be greyed out correctly.
  // The actual overlay data lives in these refs; the store stacks hold
  // placeholder entries so their .length reflects available undo/redo steps.
  const overlayUndoRef = useRef<Overlay[][]>([]);
  const overlayRedoRef = useRef<Overlay[][]>([]);

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

  // Draw tool
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStrokeColor, setDrawStrokeColor] = useState("#ff0000");
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
  const drawLastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Shape tool
  const [shapeType, setShapeType] = useState<
    "rectangle" | "circle" | "line" | "arrow"
  >("rectangle");
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#ff0000");
  const [shapeFillColor, setShapeFillColor] = useState<string | null>(null);
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  // pendingShape: the shape overlay being positioned before commit
  const [pendingShape, setPendingShape] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Annotation tools (highlight, underline, strikethrough, note)
  const [annotationColor, setAnnotationColor] = useState("#FFFF00");
  const [annotationOpacity, setAnnotationOpacity] = useState(50);
  const [noteText, setNoteText] = useState("Note");
  const [noteColor, setNoteColor] = useState("#FFFF88");

  // Page Numbers tool
  const [pageNumPosition, setPageNumPosition] =
    useState<PageNumberPosition>("bottom-center");
  const [pageNumFormat, setPageNumFormat] = useState<PageNumberFormat>("1");
  const [pageNumFont, setPageNumFont] = useState("Helvetica");
  const [pageNumSize, setPageNumSize] = useState(12);
  const [pageNumColor, setPageNumColor] = useState("#000000");

  // OCR Edit tool
  const [ocrWords, setOcrWords] = useState<
    Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>
  >([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedOcrWord, setSelectedOcrWord] = useState<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  } | null>(null);
  const [ocrEditText, setOcrEditText] = useState("");

  // ── Snap-to-grid (task 15.2) ──────────────────────────────────────────────
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);

  // ── Multi-select (task 15.3) ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Zoom (task 15.4) ──────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<0.5 | 0.75 | 1 | 1.25 | 1.5>(1);

  // ── Sidebar resize (task 15.5) ────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = localStorage.getItem("aurora-sidebar-width");
    const parsed = stored ? parseInt(stored, 10) : 300;
    return Math.min(420, Math.max(220, isNaN(parsed) ? 300 : parsed));
  });

  // ── Context menu (task 15.7) ──────────────────────────────────────────────
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ── Thumbnail hover preview (task 15.8) ───────────────────────────────────
  const [hoveredThumbIndex, setHoveredThumbIndex] = useState<number | null>(
    null,
  );
  const thumbHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay drag/resize — origin refs used by useDragOverlay callbacks
  const overlayDragOriginRef = useRef<{
    id: string;
    origX: number;
    origY: number;
  } | null>(null);
  const overlayResizeOriginRef = useRef<{
    id: string;
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

  /**
   * Push current overlays to the overlay undo stack before any overlay mutation.
   * Clears the redo stack (a new mutation invalidates redo history).
   * Syncs with the Zustand store so toolbar buttons reflect stack state.
   */
  function pushOverlayUndo(curOverlays: Overlay[]) {
    const snapshot = curOverlays.map((o) => ({ ...o }));
    overlayUndoRef.current = [...overlayUndoRef.current, snapshot].slice(
      -MAX_OVERLAY_UNDO,
    );
    // Clear redo stack — new mutation invalidates redo history
    overlayRedoRef.current = [];
    // Sync store: rebuild undo stack with placeholder entries matching ref length
    clearUndoRedo();
    overlayUndoRef.current.forEach(() => pushUndo(true));
  }

  // ── Cleanup on unmount — free all in-memory PDF data ──────────────────────
  useEffect(() => {
    return () => {
      setPdfBytes(null);
      setThumbnails([]);
      setPagePreviews([]);
      setSnapshots([]);
      setOverlays([]);
      clearUndoRedo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Overlay undo/redo — listen to global keyboard shortcut events ──────────
  // useKeyboardShortcuts dispatches aurora:undo / aurora:redo after calling
  // popUndo() / popRedo() on the store. We listen here to perform the actual
  // overlay restore using our local ref stacks.
  useEffect(() => {
    const handleUndo = () => {
      if (overlayUndoRef.current.length === 0) return;
      const prev = overlayUndoRef.current[overlayUndoRef.current.length - 1];
      // Push current overlays to redo stack
      overlayRedoRef.current = [
        ...overlayRedoRef.current,
        overlays.map((o) => ({ ...o })),
      ].slice(-MAX_OVERLAY_UNDO);
      // Pop from undo stack
      overlayUndoRef.current = overlayUndoRef.current.slice(0, -1);
      // Restore overlays
      setOverlays(prev);
      setSelectedId(null);
      // Sync store stacks
      clearUndoRedo();
      overlayUndoRef.current.forEach(() => pushUndo(true));
      overlayRedoRef.current.forEach(() => pushRedo(true));
    };

    const handleRedo = () => {
      if (overlayRedoRef.current.length === 0) return;
      const next = overlayRedoRef.current[overlayRedoRef.current.length - 1];
      // Push current overlays to undo stack
      overlayUndoRef.current = [
        ...overlayUndoRef.current,
        overlays.map((o) => ({ ...o })),
      ].slice(-MAX_OVERLAY_UNDO);
      // Pop from redo stack
      overlayRedoRef.current = overlayRedoRef.current.slice(0, -1);
      // Restore overlays
      setOverlays(next);
      setSelectedId(null);
      // Sync store stacks
      clearUndoRedo();
      overlayUndoRef.current.forEach(() => pushUndo(true));
      overlayRedoRef.current.forEach(() => pushRedo(true));
    };

    window.addEventListener("aurora:undo", handleUndo);
    window.addEventListener("aurora:redo", handleRedo);
    return () => {
      window.removeEventListener("aurora:undo", handleUndo);
      window.removeEventListener("aurora:redo", handleRedo);
    };
    // overlays is a dependency so the closures capture the latest value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays]);

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
    // Clear undo/redo when a new file is loaded
    overlayUndoRef.current = [];
    overlayRedoRef.current = [];
    clearUndoRedo();
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

  // ── Undo (toolbar button — full PDF snapshot restore) ─────────────────────

  function handleUndo() {
    setSnapshots((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
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
      setSelectedIds(new Set());
      return;
    }
    if (activeTool === "draw") return;
    if (activeTool === "ocr-edit") return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Account for zoom: the canvas is scaled, so we need to divide by zoom
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const id = `${Date.now()}`;

    if (
      activeTool === "highlight" ||
      activeTool === "underline" ||
      activeTool === "strikethrough"
    ) {
      pushOverlayUndo(overlays);
      setOverlays((prev) => [
        ...prev,
        {
          id,
          type: "annotation",
          annotationType: activeTool,
          pageIndex: currentPage,
          x,
          y,
          width: 200,
          height: activeTool === "highlight" ? 20 : 4,
          color: annotationColor,
          opacity: annotationOpacity,
        },
      ]);
      setSelectedId(id);
      return;
    }
    if (activeTool === "note") {
      pushOverlayUndo(overlays);
      setOverlays((prev) => [
        ...prev,
        {
          id,
          type: "note",
          pageIndex: currentPage,
          x,
          y,
          width: 160,
          height: 80,
          text: noteText,
          color: noteColor,
          fontSize: 11,
        },
      ]);
      setSelectedId(id);
      return;
    }

    if (activeTool === "shape") {
      setPendingShape({ x: x - 60, y: y - 40, width: 120, height: 80 });
      return;
    }

    // Push overlay undo snapshot before adding a new overlay
    pushOverlayUndo(overlays);

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
      if (!pdfBytes) return;
      saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
      applyWatermark(
        pdfBytes,
        {
          type: "text",
          text: wmText,
          fontSize: 48,
          opacity: wmOpacity,
          color: wmColor,
          rotation: wmRotation,
          placement: "center",
          fontFamily: "Helvetica",
          tile: false,
          layer: "foreground",
          pageRange: "",
        },
        () => {},
      )
        .then(async (newBytes) => {
          setPdfBytes(newBytes);
          const newPreview = await renderPagePreview(newBytes, currentPage);
          setPagePreviews((prev) => {
            const next = [...prev];
            next[currentPage] = newPreview;
            return next;
          });
          const newThumb = await renderThumbnail(newBytes, currentPage);
          setThumbnails((prev) => {
            const next = [...prev];
            next[currentPage] = newThumb;
            return next;
          });
        })
        .catch((e) =>
          failSession(e instanceof Error ? e.message : "Watermark failed."),
        );
      return;
    }
  }

  // ── Overlay drag/resize — called by OverlayItem via useDragOverlay ─────────

  /** Snap a coordinate to the nearest 10px grid line when within 5px */
  function snapToGrid(v: number): number {
    return Math.abs(v % 10) < 5 ? Math.round(v / 10) * 10 : v;
  }

  // Multi-select drag: store origins for all selected overlays
  const multiDragOriginsRef = useRef<
    Map<string, { origX: number; origY: number }>
  >(new Map());

  const beginOverlayDrag = useCallback(
    (id: string, shiftKey?: boolean) => {
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      overlayDragOriginRef.current = { id, origX: ov.x, origY: ov.y };
      setIsDraggingOverlay(true);

      // Multi-select: shift+click toggles membership
      if (shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        // Don't change single selectedId when shift-clicking
        return;
      }

      // Normal click: if item is already in multi-select set, keep set; otherwise reset to single
      setSelectedIds((prev) => {
        if (prev.has(id)) return prev;
        return new Set([id]);
      });
      setSelectedId(id);

      // Store origins for all currently selected overlays for multi-drag
      const currentSelected = selectedIds.has(id) ? selectedIds : new Set([id]);
      const origins = new Map<string, { origX: number; origY: number }>();
      overlays.forEach((o) => {
        if (currentSelected.has(o.id)) {
          origins.set(o.id, { origX: o.x, origY: o.y });
        }
      });
      multiDragOriginsRef.current = origins;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overlays, selectedIds],
  );

  const moveOverlayDrag = useCallback((id: string, dx: number, dy: number) => {
    const origin = overlayDragOriginRef.current;
    if (!origin || origin.id !== id) return;

    setOverlays((prev) =>
      prev.map((o) => {
        const multiOrigin = multiDragOriginsRef.current.get(o.id);
        if (multiOrigin) {
          // Move all selected overlays together
          const rawX = multiOrigin.origX + dx;
          const rawY = multiOrigin.origY + dy;
          return { ...o, x: snapToGrid(rawX), y: snapToGrid(rawY) };
        }
        if (o.id === id) {
          const rawX = origin.origX + dx;
          const rawY = origin.origY + dy;
          return { ...o, x: snapToGrid(rawX), y: snapToGrid(rawY) };
        }
        return o;
      }),
    );
  }, []);

  const endOverlayDrag = useCallback(() => {
    overlayDragOriginRef.current = null;
    multiDragOriginsRef.current = new Map();
    setIsDraggingOverlay(false);
  }, []);

  const beginOverlayResize = useCallback(
    (id: string) => {
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      overlayResizeOriginRef.current = {
        id,
        origW: ov.width,
        origH: ov.height,
      };
    },
    [overlays],
  );

  const moveOverlayResize = useCallback(
    (id: string, dx: number, dy: number) => {
      const origin = overlayResizeOriginRef.current;
      if (!origin || origin.id !== id) return;
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                width: Math.max(40, origin.origW + dx),
                height: Math.max(20, origin.origH + dy),
              }
            : o,
        ),
      );
    },
    [],
  );

  const endOverlayResize = useCallback(() => {
    overlayResizeOriginRef.current = null;
  }, []);

  function deleteOverlay(id: string) {
    // Push overlay undo snapshot before deleting
    pushOverlayUndo(overlays);
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    setSelectedId(null);
  }

  // ── Draw canvas helpers ────────────────────────────────────────────────────

  function startDraw(x: number, y: number) {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    drawLastPosRef.current = { x, y };
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function continueDraw(x: number, y: number) {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !drawLastPosRef.current) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = drawStrokeColor;
    ctx.lineWidth = drawStrokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    drawLastPosRef.current = { x, y };
  }

  function endDraw() {
    setIsDrawing(false);
    drawLastPosRef.current = null;
  }

  function clearDrawCanvas() {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function commitDrawing() {
    const canvas = drawCanvasRef.current;
    if (!canvas || !pdfBytes) return;
    const dataUrl = canvas.toDataURL("image/png");
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
    try {
      const newBytes = await applyDrawOverlay(pdfBytes, currentPage, dataUrl);
      setPdfBytes(newBytes);
      const newPreview = await renderPagePreview(newBytes, currentPage);
      setPagePreviews((prev) => {
        const next = [...prev];
        next[currentPage] = newPreview;
        return next;
      });
      const newThumb = await renderThumbnail(newBytes, currentPage);
      setThumbnails((prev) => {
        const next = [...prev];
        next[currentPage] = newThumb;
        return next;
      });
      clearDrawCanvas();
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Draw commit failed.");
    }
  }

  // ── OCR Edit helpers ───────────────────────────────────────────────────────

  async function runOcrOnPage() {
    if (!pagePreviews[currentPage]) return;
    setOcrLoading(true);
    setOcrWords([]);
    setSelectedOcrWord(null);
    setOcrEditText("");
    try {
      const dataUrl = pagePreviews[currentPage];
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load page preview"));
        img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(img, 0, 0);
      const words = await recognizeWithBoundingBoxes(canvas, "eng");
      setOcrWords(words);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "OCR failed.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function commitOcrEdit() {
    if (!pdfBytes || !selectedOcrWord || !ocrEditText.trim()) return;
    const word = selectedOcrWord;
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
    try {
      const PREVIEW_SCALE = 1.2;
      const DPI_FACTOR = 72 / 96;
      const pxToPt = DPI_FACTOR / PREVIEW_SCALE;

      const previewDataUrl = pagePreviews[currentPage];
      let previewH = 1010;
      if (previewDataUrl) {
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            previewH = img.naturalHeight;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = previewDataUrl;
        });
      }
      const pdfPageH = previewH * pxToPt;
      const bboxWidthPx = word.bbox.x1 - word.bbox.x0;
      const bboxHeightPx = word.bbox.y1 - word.bbox.y0;
      const rectX = word.bbox.x0 * pxToPt;
      const rectY = pdfPageH - word.bbox.y1 * pxToPt;
      const rectW = bboxWidthPx * pxToPt;
      const rectH = bboxHeightPx * pxToPt;

      const whiteRect = {
        pageIndex: currentPage,
        type: "rectangle" as const,
        x: rectX,
        y: rectY,
        width: Math.max(rectW, 4),
        height: Math.max(rectH, 4),
        strokeColor: "#ffffff",
        fillColor: "#ffffff",
        strokeWidth: 0,
      };
      let newBytes = await applyShapeOverlay(pdfBytes, currentPage, whiteRect);

      const fontSize = Math.max(6, Math.round(rectH * 0.85));
      const annotation: TextAnnotation = {
        pageIndex: currentPage,
        text: ocrEditText,
        x: rectX,
        y: rectY + fontSize * 0.1,
        fontSize,
        color: "#000000",
      };
      newBytes = await addTextAnnotation(newBytes, annotation);
      setPdfBytes(newBytes);

      const newPreview = await renderPagePreview(newBytes, currentPage);
      setPagePreviews((prev) => {
        const next = [...prev];
        next[currentPage] = newPreview;
        return next;
      });
      const newThumb = await renderThumbnail(newBytes, currentPage);
      setThumbnails((prev) => {
        const next = [...prev];
        next[currentPage] = newThumb;
        return next;
      });

      setSelectedOcrWord(null);
      setOcrEditText("");
      setOcrWords([]);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "OCR edit commit failed.");
    }
  }

  // ── Shape helpers ──────────────────────────────────────────────────────────

  async function commitShape() {
    if (!pdfBytes || !pendingShape || !pagePreviews[currentPage]) return;

    const previewImgEl = document.querySelector(
      ".editor-page-wrap img",
    ) as HTMLImageElement | null;

    const sizes = await getPageSizes(pdfBytes);
    const pageH = sizes[currentPage]?.height ?? 842;
    const pageW = sizes[currentPage]?.width ?? 595;

    let scaleX: number;
    let scaleY: number;

    if (previewImgEl && previewImgEl.clientWidth > 0) {
      scaleX = pageW / previewImgEl.clientWidth;
      scaleY = pageH / previewImgEl.clientHeight;
    } else {
      scaleX = 72 / 96 / 1.2;
      scaleY = 72 / 96 / 1.2;
    }

    const shape: ShapeAnnotation = {
      pageIndex: currentPage,
      type: shapeType,
      x: pendingShape.x * scaleX,
      y: pageH - (pendingShape.y + pendingShape.height) * scaleY,
      width: pendingShape.width * scaleX,
      height: pendingShape.height * scaleY,
      strokeColor: shapeStrokeColor,
      fillColor: shapeFillColor,
      strokeWidth: shapeStrokeWidth,
    };
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
    try {
      const newBytes = await applyShapeOverlay(pdfBytes, currentPage, shape);
      setPdfBytes(newBytes);
      const newPreview = await renderPagePreview(newBytes, currentPage);
      setPagePreviews((prev) => {
        const next = [...prev];
        next[currentPage] = newPreview;
        return next;
      });
      const newThumb = await renderThumbnail(newBytes, currentPage);
      setThumbnails((prev) => {
        const next = [...prev];
        next[currentPage] = newThumb;
        return next;
      });
      setPendingShape(null);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Shape commit failed.");
    }
  }

  // ── Page Numbers tool ─────────────────────────────────────────────────────

  async function applyPageNumbersTool() {
    if (!pdfBytes) return;
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
    try {
      const newBytes = await applyPageNumbers(
        pdfBytes,
        {
          position: pageNumPosition,
          format: pageNumFormat,
          fontFamily: pageNumFont,
          fontSize: pageNumSize,
          color: pageNumColor,
        },
        () => {},
      );
      setPdfBytes(newBytes);
      const n = await getPageCount(newBytes);
      const newThumbs: string[] = [];
      const newPreviews: string[] = [];
      for (let i = 0; i < n; i++) {
        newThumbs.push(await renderThumbnail(newBytes, i));
        setThumbnails([...newThumbs]);
        newPreviews.push(await renderPagePreview(newBytes, i));
        setPagePreviews([...newPreviews]);
      }
    } catch (e) {
      failSession(
        e instanceof Error ? e.message : "Page numbers apply failed.",
      );
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!pdfBytes || !originalFile) return;
    updateProgress(0, "Applying edits…");
    try {
      let bytes = pdfBytes;
      const pageSizes = await getPageSizes(bytes);
      const previewImgEl = document.querySelector(
        ".editor-page-wrap img",
      ) as HTMLImageElement | null;

      for (const ov of overlays) {
        const pageH = pageSizes[ov.pageIndex]?.height ?? 842;
        const pageW = pageSizes[ov.pageIndex]?.width ?? 595;

        let scaleX: number;
        let scaleY: number;

        if (previewImgEl && previewImgEl.clientWidth > 0) {
          // Divide by zoom to get the unscaled canvas coordinates
          scaleX = pageW / (previewImgEl.clientWidth / zoom);
          scaleY = pageH / (previewImgEl.clientHeight / zoom);
        } else {
          const naturalW = pageW * 1.2 * (96 / 72);
          const naturalH = pageH * 1.2 * (96 / 72);
          scaleX = pageW / naturalW;
          scaleY = pageH / naturalH;
        }

        // Divide overlay coordinates by zoom before passing to engine
        const ovX = ov.x / zoom;
        const ovY = ov.y / zoom;
        const ovW = ov.width / zoom;
        const ovH = ov.height / zoom;

        if (ov.type === "text" && ov.text) {
          const annotation: TextAnnotation = {
            pageIndex: ov.pageIndex,
            text: ov.text,
            x: ovX * scaleX,
            y: pageH - (ovY + (ov.fontSize ?? 12) / zoom) * scaleY,
            fontSize: (ov.fontSize ?? 12) / zoom,
            color: ov.color ?? "#000000",
            rotation: ov.rotation,
            opacity: ov.opacity,
          };
          bytes = await addTextAnnotation(bytes, annotation);
        } else if (ov.type === "image" && ov.dataUrl) {
          bytes = await embedImageOverlay(bytes, {
            pageIndex: ov.pageIndex,
            dataUrl: ov.dataUrl,
            x: (ovX * scaleX) / pageW,
            y: (pageH - (ovY + ovH) * scaleY) / pageH,
            width: (ovW * scaleX) / pageW,
            height: (ovH * scaleY) / pageH,
          });
        } else if (ov.type === "annotation" && ov.annotationType) {
          // Highlight, underline, strikethrough — use edit-engine's applyEdits
          bytes = await applyEdits(bytes, [
            {
              kind: "annotation",
              id: ov.id,
              pageIndex: ov.pageIndex,
              annotationType: ov.annotationType,
              x: ovX * scaleX,
              y: pageH - (ovY + ovH) * scaleY,
              width: ovW * scaleX,
              height: ovH * scaleY,
              color: ov.color ?? "#FFFF00",
              opacity: ov.opacity,
            },
          ]);
        } else if (ov.type === "note" && ov.text) {
          // Sticky note — use edit-engine's applyEdits
          bytes = await applyEdits(bytes, [
            {
              kind: "note",
              id: ov.id,
              pageIndex: ov.pageIndex,
              x: ovX * scaleX,
              y: pageH - (ovY + ovH) * scaleY,
              text: ov.text,
              color: ov.color ?? "#FFFF88",
              fontSize: (ov.fontSize ?? 11) / zoom,
            },
          ]);
        }
      }

      updateProgress(90, "Saving…");
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
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
    overlayUndoRef.current = [];
    overlayRedoRef.current = [];
    clearUndoRedo();
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

  // ── Sidebar resize (task 15.5) ────────────────────────────────────────────
  const sidebarResizingRef = useRef(false);

  const beginSidebarResize = useCallback(() => {
    sidebarResizingRef.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!sidebarResizingRef.current) return;
      // The sidebar starts at x=0; its right edge is at sidebarWidth
      // We clamp to [220, 420]
      const newWidth = Math.min(420, Math.max(220, e.clientX));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = (e: MouseEvent) => {
      sidebarResizingRef.current = false;
      const newWidth = Math.min(420, Math.max(220, e.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem("aurora-sidebar-width", String(newWidth));
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // ── Thumbnail hover preview (task 15.8) ───────────────────────────────────
  const handleThumbMouseEnter = useCallback((index: number) => {
    thumbHoverTimerRef.current = setTimeout(() => {
      setHoveredThumbIndex(index);
    }, 300);
  }, []);

  const handleThumbMouseLeave = useCallback(() => {
    if (thumbHoverTimerRef.current) {
      clearTimeout(thumbHoverTimerRef.current);
      thumbHoverTimerRef.current = null;
    }
    setHoveredThumbIndex(null);
  }, []);

  // ── Duplicate overlay (task 15.6) ─────────────────────────────────────────
  function duplicateOverlay(id: string) {
    const ov = overlays.find((o) => o.id === id);
    if (!ov) return;
    pushOverlayUndo(overlays);
    const newId = `${Date.now()}`;
    const duplicate: typeof ov = {
      ...ov,
      id: newId,
      x: ov.x + 10,
      y: ov.y + 10,
    };
    setOverlays((prev) => [...prev, duplicate]);
    setSelectedId(newId);
  }

  // ── Bring overlay to front (task 15.6) ────────────────────────────────────
  function bringOverlayToFront(id: string) {
    pushOverlayUndo(overlays);
    setOverlays((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx === -1) return prev;
      const item = prev[idx];
      return [...prev.filter((o) => o.id !== id), item];
    });
  }

  // ── Select all overlays on current page (task 15.7) ───────────────────────
  function selectAllOverlays() {
    const ids = overlays
      .filter((o) => o.pageIndex === currentPage)
      .map((o) => o.id);
    setSelectedIds(new Set(ids));
    if (ids.length > 0) setSelectedId(ids[ids.length - 1]);
  }

  // ── Clear canvas overlays on current page (task 15.7) ─────────────────────
  function clearCanvasOverlays() {
    pushOverlayUndo(overlays);
    setOverlays((prev) => prev.filter((o) => o.pageIndex !== currentPage));
    setSelectedId(null);
    setSelectedIds(new Set());
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
    // Multi-select (task 15.3)
    selectedIds,
    setSelectedIds,
    activeTool,
    setActiveTool,
    deleteConfirm,
    setDeleteConfirm,
    dragSrc,
    setDragSrc,
    dragOver,
    setDragOver,
    // Undo/redo state for toolbar button disabled state
    overlayUndoCount: undoStack.length,
    overlayRedoCount: redoStack.length,
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
    drawCanvasRef,
    isDrawing,
    drawStrokeColor,
    setDrawStrokeColor,
    drawStrokeWidth,
    setDrawStrokeWidth,
    startDraw,
    continueDraw,
    endDraw,
    clearDrawCanvas,
    commitDrawing,
    shapeType,
    setShapeType,
    shapeStrokeColor,
    setShapeStrokeColor,
    shapeFillColor,
    setShapeFillColor,
    shapeStrokeWidth,
    setShapeStrokeWidth,
    pendingShape,
    setPendingShape,
    commitShape,
    ocrWords,
    ocrLoading,
    selectedOcrWord,
    setSelectedOcrWord,
    ocrEditText,
    setOcrEditText,
    runOcrOnPage,
    commitOcrEdit,
    pageNumPosition,
    setPageNumPosition,
    pageNumFormat,
    setPageNumFormat,
    pageNumFont,
    setPageNumFont,
    pageNumSize,
    setPageNumSize,
    pageNumColor,
    setPageNumColor,
    applyPageNumbersTool,
    currentOverlays,
    handleFileDrop,
    confirmDelete,
    handleThumbDrop,
    handleCanvasClick,
    beginOverlayDrag,
    moveOverlayDrag,
    endOverlayDrag,
    beginOverlayResize,
    moveOverlayResize,
    endOverlayResize,
    deleteOverlay,
    handleExport,
    handleReset,
    handleUndo,
    // Snap-to-grid (task 15.2)
    isDraggingOverlay,
    // Zoom (task 15.4)
    zoom,
    setZoom,
    // Sidebar resize (task 15.5)
    sidebarWidth,
    beginSidebarResize,
    // Inline toolbar helpers (task 15.6)
    duplicateOverlay,
    bringOverlayToFront,
    // Context menu (task 15.7)
    contextMenuPos,
    setContextMenuPos,
    selectAllOverlays,
    clearCanvasOverlays,
    // Thumbnail hover preview (task 15.8)
    hoveredThumbIndex,
    handleThumbMouseEnter,
    handleThumbMouseLeave,
    // Annotation tools
    annotationColor,
    setAnnotationColor,
    annotationOpacity,
    setAnnotationOpacity,
    noteText,
    setNoteText,
    noteColor,
    setNoteColor,
  };
}
