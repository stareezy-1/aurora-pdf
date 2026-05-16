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
import { recognizeWithBoundingBoxes } from "@/engines/ocr-engine";
import { buildOutputFilename } from "@/lib/filename-utils";
import type { TextAnnotation, ShapeAnnotation } from "@/types/engine.types";
import type { PageNumberPosition, PageNumberFormat } from "@/types/tool.types";

const MAX_SNAPSHOTS = 5; // Keep low to limit memory — each snapshot = full PDF copy

export type Tool =
  | "select"
  | "text"
  | "image"
  | "sign"
  | "watermark"
  | "draw"
  | "shape"
  | "ocr-edit"
  | "page-numbers";

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
  rotation?: number; // degrees — used by watermark overlays
  opacity?: number; // 0–100 — used by watermark overlays
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

  // Draw tool
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStrokeColor, setDrawStrokeColor] = useState("#ff0000");
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(3);
  const drawLastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Shape tool
  const [shapeType, setShapeType] = useState<"rectangle" | "circle" | "line">(
    "rectangle",
  );
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

  // ── Cleanup on unmount — free all in-memory PDF data ──────────────────────
  useEffect(() => {
    return () => {
      setPdfBytes(null);
      setThumbnails([]);
      setPagePreviews([]);
      setSnapshots([]);
      setOverlays([]);
    };
  }, []);

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
    // Draw tool: canvas handles its own events — ignore clicks here
    if (activeTool === "draw") return;
    // OCR Edit tool: word bbox divs handle their own clicks — ignore here
    if (activeTool === "ocr-edit") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = `${Date.now()}`;

    // Shape tool: place a pending shape overlay
    if (activeTool === "shape") {
      setPendingShape({ x: x - 60, y: y - 40, width: 120, height: 80 });
      return;
    }

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
      // Apply watermark immediately using the same engine function as the
      // standalone Watermark page — this guarantees preview matches export.
      if (!pdfBytes) return;
      saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
      applyWatermark(
        pdfBytes,
        {
          text: wmText,
          fontSize: 48,
          opacity: wmOpacity,
          color: wmColor,
          rotation: wmRotation,
          placement: "diagonal",
          fontFamily: "Helvetica",
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

  /** Called when a drag gesture starts on an overlay — records origin position */
  const beginOverlayDrag = useCallback(
    (id: string) => {
      const ov = overlays.find((o) => o.id === id);
      if (!ov) return;
      overlayDragOriginRef.current = { id, origX: ov.x, origY: ov.y };
      setSelectedId(id);
    },
    [overlays],
  );

  /** Called on every drag move delta — updates overlay position */
  const moveOverlayDrag = useCallback((id: string, dx: number, dy: number) => {
    const origin = overlayDragOriginRef.current;
    if (!origin || origin.id !== id) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, x: origin.origX + dx, y: origin.origY + dy } : o,
      ),
    );
  }, []);

  /** Called when a drag gesture ends — clears origin ref */
  const endOverlayDrag = useCallback(() => {
    overlayDragOriginRef.current = null;
  }, []);

  /** Called when a resize gesture starts on an overlay — records origin size */
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

  /** Called on every resize move delta — updates overlay size */
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

  /** Called when a resize gesture ends — clears origin ref */
  const endOverlayResize = useCallback(() => {
    overlayResizeOriginRef.current = null;
  }, []);

  function deleteOverlay(id: string) {
    // Save snapshot before deleting
    if (pdfBytes)
      saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
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
    // Save snapshot before mutation
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);
    try {
      const newBytes = await applyDrawOverlay(pdfBytes, currentPage, dataUrl);
      setPdfBytes(newBytes);
      // Re-render the current page preview
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
      // Draw the page preview data URL onto a canvas so we can pass it to Tesseract
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

    // Save snapshot before mutation
    saveSnapshot(pdfBytes, thumbnails, pagePreviews, overlays, currentPage);

    try {
      // The bounding box coords are in preview image pixel space.
      // renderPagePreview renders at 1.2x scale (viewport scale: 1.2).
      // PDF points = preview_px / 1.2 * (72/96) = preview_px / 1.6
      // But pdf-lib uses 72dpi points, and the preview canvas is at 96dpi * 1.2 = 115.2dpi
      // So: pdf_pt = preview_px * (72 / 115.2) = preview_px * 0.625
      const PREVIEW_SCALE = 1.2; // from renderPagePreview
      const DPI_FACTOR = 72 / 96; // screen dpi to pdf points
      const pxToPt = DPI_FACTOR / PREVIEW_SCALE; // 0.625

      // Get the actual PDF page dimensions
      const previewDataUrl = pagePreviews[currentPage];
      let previewH = 1010; // 842 * 1.2 default
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
      // PDF page height in points (preview height / PREVIEW_SCALE * DPI_FACTOR)
      const pdfPageH = previewH * pxToPt;

      const bboxWidthPx = word.bbox.x1 - word.bbox.x0;
      const bboxHeightPx = word.bbox.y1 - word.bbox.y0;

      // Step 1: Cover the original text with a white rectangle
      // pdf-lib y=0 is bottom of page, so flip: pdfY = pdfPageH - bbox.y1 * pxToPt
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

      // Step 2: Draw the new text — font size matches the original word height
      const fontSize = Math.max(6, Math.round(rectH * 0.85));
      const annotation: TextAnnotation = {
        pageIndex: currentPage,
        text: ocrEditText,
        x: rectX,
        y: rectY + fontSize * 0.1, // small baseline offset
        fontSize,
        color: "#000000",
      };
      newBytes = await addTextAnnotation(newBytes, annotation);

      setPdfBytes(newBytes);

      // Refresh the current page preview and thumbnail
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

      // Clear OCR state after successful edit
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

    // Read the actual displayed image dimensions from the DOM — the preview
    // image may be scaled down by CSS maxWidth, so we can't use a fixed factor.
    const previewImgEl = document.querySelector(
      ".editor-page-wrap img",
    ) as HTMLImageElement | null;

    // Get actual PDF page dimensions for y-flip
    const sizes = await getPageSizes(pdfBytes);
    const pageH = sizes[currentPage]?.height ?? 842;
    const pageW = sizes[currentPage]?.width ?? 595;

    let scaleX: number;
    let scaleY: number;

    if (previewImgEl && previewImgEl.clientWidth > 0) {
      scaleX = pageW / previewImgEl.clientWidth;
      scaleY = pageH / previewImgEl.clientHeight;
    } else {
      // Fallback: theoretical 1.2× render scale at 96dpi → 72pt
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
    // Save snapshot before mutation
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
    // Save snapshot before mutation
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
        () => {
          // Progress is internal — no global store update needed for this tool
        },
      );
      setPdfBytes(newBytes);
      // Refresh all thumbnails and previews
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

      // Get actual PDF page dimensions (needed for coordinate conversion)
      const pageSizes = await getPageSizes(bytes);

      // The preview image is rendered at 1.2× scale by renderPagePreview,
      // then displayed in the browser with maxWidth constraint.
      // We need to read the actual displayed image size from the DOM to get
      // the correct pixel→point scale factor.
      //
      // The preview <img> is inside .editor-page-wrap. We query it here.
      // If the DOM element isn't available (e.g. during testing), fall back
      // to the natural image dimensions derived from the 1.2× render scale.
      const previewImgEl = document.querySelector(
        ".editor-page-wrap img",
      ) as HTMLImageElement | null;

      // Apply all pending overlays in page order
      for (const ov of overlays) {
        const pageH = pageSizes[ov.pageIndex]?.height ?? 842;
        const pageW = pageSizes[ov.pageIndex]?.width ?? 595;

        // Compute scale: overlay coords are in CSS display pixels of the preview img.
        // naturalWidth = pageW * 1.2 * (96/72) — but renderPagePreview uses pdfjs
        // which renders at 1.2 scale at 96dpi, so naturalWidth ≈ pageW * 1.2 * (96/72).
        // Actually pdfjs viewport at scale 1.2 gives: width = pageW_pt * 1.2 * (96/72).
        // So: pdf_pt = css_px * (naturalWidth / displayWidth) / (96/72) / 1.2
        //           = css_px * (naturalWidth / displayWidth) * (72/96) / 1.2
        //
        // Simpler: scaleX = pageW / naturalWidth, then pdf_pt = css_px * (displayWidth / naturalWidth) * scaleX...
        // Actually the cleanest formula:
        //   pdf_pt_x = css_px_x * (pageW / displayWidth)
        //   pdf_pt_y = css_px_y * (pageH / displayHeight)
        // because displayWidth maps to pageW points and displayHeight maps to pageH points.

        let scaleX: number;
        let scaleY: number;

        if (previewImgEl && previewImgEl.clientWidth > 0) {
          // Use actual displayed dimensions — most accurate
          scaleX = pageW / previewImgEl.clientWidth;
          scaleY = pageH / previewImgEl.clientHeight;
        } else {
          // Fallback: natural image size from 1.2× render at 96dpi
          // naturalWidth = pageW * 1.2 * (96/72)
          const naturalW = pageW * 1.2 * (96 / 72);
          const naturalH = pageH * 1.2 * (96 / 72);
          scaleX = pageW / naturalW;
          scaleY = pageH / naturalH;
        }

        if (ov.type === "text" && ov.text) {
          const annotation: TextAnnotation = {
            pageIndex: ov.pageIndex,
            text: ov.text,
            x: ov.x * scaleX,
            // pdf-lib y=0 is bottom; CSS y=0 is top.
            // ov.y is the top of the text box in CSS px.
            // The text baseline sits at ov.y + fontSize (approx).
            // Convert to PDF points: multiply by scaleY, then flip.
            y: pageH - (ov.y + (ov.fontSize ?? 12)) * scaleY,
            fontSize: ov.fontSize ?? 12,
            color: ov.color ?? "#000000",
            rotation: ov.rotation,
            opacity: ov.opacity,
          };
          bytes = await addTextAnnotation(bytes, annotation);
        } else if (ov.type === "image" && ov.dataUrl) {
          bytes = await embedImageOverlay(bytes, {
            pageIndex: ov.pageIndex,
            dataUrl: ov.dataUrl,
            x: (ov.x * scaleX) / pageW,
            y: (pageH - (ov.y + ov.height) * scaleY) / pageH,
            width: (ov.width * scaleX) / pageW,
            height: (ov.height * scaleY) / pageH,
          });
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
    // Draw tool
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
    // Shape tool
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
    // OCR Edit tool
    ocrWords,
    ocrLoading,
    selectedOcrWord,
    setSelectedOcrWord,
    ocrEditText,
    setOcrEditText,
    runOcrOnPage,
    commitOcrEdit,
    // Page Numbers tool
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
  };
}
