import { useState, useTransition, useEffect } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  renderThumbnail,
  getPageCount,
  deletePages,
  reorderPages,
  rotatePages,
  duplicatePage,
} from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";

export function useOrganizePdf() {
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

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Undo stack — each entry is a snapshot before a mutation
  const [history, setHistory] = useState<
    Array<{ pdfBytes: Uint8Array; thumbnails: string[]; pageOrder: number[] }>
  >([]);

  function saveHistory(bytes: Uint8Array, thumbs: string[], order: number[]) {
    // Cap at 5 snapshots to limit memory usage (each snapshot = full PDF copy)
    setHistory((prev) => [
      ...prev.slice(-4),
      {
        pdfBytes: new Uint8Array(bytes),
        thumbnails: [...thumbs],
        pageOrder: [...order],
      },
    ]);
  }

  function handleUndo() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
      setPdfBytes(snap.pdfBytes);
      setThumbnails(snap.thumbnails);
      setPageOrder(snap.pageOrder);
      return prev.slice(0, -1);
    });
  }

  // ── Cleanup on unmount — free all in-memory PDF data ──────────────────────
  useEffect(() => {
    return () => {
      setPdfBytes(null);
      setThumbnails([]);
      setHistory([]);
    };
  }, []);

  // ── File load ──────────────────────────────────────────────────────────────

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    // Clear previous data before loading new file
    setPdfBytes(null);
    setThumbnails([]);
    setPageOrder([]);
    setHistory([]);
    setPdfFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
    setCurrentPage(0);
    startTransition(async () => {
      const n = await getPageCount(bytes);
      const order = Array.from({ length: n }, (_, i) => i);
      setPageOrder(order);
      const thumbs: string[] = [];
      for (let i = 0; i < n; i++) {
        thumbs.push(await renderThumbnail(bytes, i));
        setThumbnails([...thumbs]);
      }
    });
  }

  // ── Delete page ────────────────────────────────────────────────────────────

  async function handleDeletePage(orderIdx: number) {
    if (!pdfBytes) return;
    const pageIdx = pageOrder[orderIdx];
    try {
      saveHistory(pdfBytes, thumbnails, pageOrder);
      const newBytes = await deletePages(pdfBytes, [pageIdx]);
      const newOrder = pageOrder.filter((_, i) => i !== orderIdx);
      const newThumbs = thumbnails.filter((_, i) => i !== orderIdx);
      setPdfBytes(newBytes);
      setPageOrder(newOrder);
      setThumbnails(newThumbs);
      if (currentPage >= orderIdx && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Delete page failed.");
    }
  }

  // ── Rotate page ────────────────────────────────────────────────────────────

  async function handleRotatePage(orderIdx: number, deg: 90 | 180 | 270) {
    if (!pdfBytes) return;
    const pageIdx = pageOrder[orderIdx];
    try {
      saveHistory(pdfBytes, thumbnails, pageOrder);
      const newBytes = await rotatePages(pdfBytes, [
        { pageIndex: pageIdx, degrees: deg },
      ]);
      setPdfBytes(newBytes);
      // Refresh thumbnail for this page
      const newThumb = await renderThumbnail(newBytes, pageIdx);
      setThumbnails((prev) => {
        const next = [...prev];
        next[orderIdx] = newThumb;
        return next;
      });
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Rotate page failed.");
    }
  }

  // ── Duplicate page ─────────────────────────────────────────────────────────

  async function handleDuplicatePage(orderIdx: number) {
    if (!pdfBytes) return;
    const pageIdx = pageOrder[orderIdx];
    try {
      saveHistory(pdfBytes, thumbnails, pageOrder);
      const newBytes = await duplicatePage(pdfBytes, pageIdx);
      // The duplicate is inserted at pageIdx + 1 in the underlying PDF.
      // We need to rebuild the order and thumbnails accordingly.
      const newPageCount = await getPageCount(newBytes);
      // Rebuild order: insert a new entry after orderIdx pointing to pageIdx + 1
      // All subsequent original page indices shift by 1
      const newOrder: number[] = [];
      for (let i = 0; i <= orderIdx; i++) {
        newOrder.push(pageOrder[i]);
      }
      // The duplicate is at pageIdx + 1 in the new PDF
      newOrder.push(pageIdx + 1);
      for (let i = orderIdx + 1; i < pageOrder.length; i++) {
        // Original pages after pageIdx shift by 1 in the new PDF
        newOrder.push(pageOrder[i] + 1);
      }

      // Rebuild thumbnails
      const newThumbs: string[] = [];
      for (let i = 0; i < newPageCount; i++) {
        newThumbs.push(await renderThumbnail(newBytes, i));
      }

      setPdfBytes(newBytes);
      setPageOrder(newOrder);
      setThumbnails(newThumbs);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Duplicate page failed.");
    }
  }

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────

  async function handleThumbDrop(targetIdx: number) {
    if (dragSrc === null || dragSrc === targetIdx || !pdfBytes) return;
    saveHistory(pdfBytes, thumbnails, pageOrder);
    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(dragSrc, 1);
    newOrder.splice(targetIdx, 0, moved);

    const newThumbs = [...thumbnails];
    const [movedThumb] = newThumbs.splice(dragSrc, 1);
    newThumbs.splice(targetIdx, 0, movedThumb);

    try {
      const newBytes = await reorderPages(pdfBytes, newOrder);
      // After reorder, page indices in the new PDF are 0..n-1 in the new order
      const resetOrder = newOrder.map((_, i) => i);
      setPdfBytes(newBytes);
      setPageOrder(resetOrder);
      setThumbnails(newThumbs);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Reorder failed.");
    }
    setDragSrc(null);
    setDragOver(null);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!pdfBytes || !pdfFile) return;
    updateProgress(0, "Saving…");
    try {
      const blob = new Blob([pdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      setComplete(blob, buildOutputFilename(pdfFile.name, "organize"));
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Save failed.");
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    clearWorkbox();
    setPdfFile(null);
    setPdfBytes(null);
    setThumbnails([]);
    setPageOrder([]);
    setCurrentPage(0);
    setHistory([]);
  }

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pdfFile,
    pdfBytes,
    thumbnails,
    pageOrder,
    currentPage,
    setCurrentPage,
    dragSrc,
    setDragSrc,
    dragOver,
    setDragOver,
    history,
    handleUndo,
    handleFileDrop,
    handleDeletePage,
    handleRotatePage,
    handleDuplicatePage,
    handleThumbDrop,
    handleSave,
    handleReset,
  };
}
