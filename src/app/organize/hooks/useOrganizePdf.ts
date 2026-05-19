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

  // Drop indicator — index between cards where the dragged item will be inserted
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Rotation tracking — one entry per page in current order (degrees, 0–359)
  const [rotations, setRotations] = useState<number[]>([]);

  // Undo stack — each entry is a snapshot before a mutation
  const [history, setHistory] = useState<
    Array<{
      pdfBytes: Uint8Array;
      thumbnails: string[];
      pageOrder: number[];
      rotations: number[];
    }>
  >([]);

  function saveHistory(
    bytes: Uint8Array,
    thumbs: string[],
    order: number[],
    rots: number[],
  ) {
    // Cap at 5 snapshots to limit memory usage (each snapshot = full PDF copy)
    setHistory((prev) => [
      ...prev.slice(-4),
      {
        pdfBytes: new Uint8Array(bytes),
        thumbnails: [...thumbs],
        pageOrder: [...order],
        rotations: [...rots],
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
      setRotations(snap.rotations);
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
    setSelectedIds(new Set());
    setRotations([]);
    setPdfFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setPdfBytes(bytes);
    setCurrentPage(0);
    startTransition(async () => {
      const n = await getPageCount(bytes);
      const order = Array.from({ length: n }, (_, i) => i);
      setPageOrder(order);
      setRotations(new Array(n).fill(0));
      const thumbs: string[] = [];
      for (let i = 0; i < n; i++) {
        thumbs.push(await renderThumbnail(bytes, i));
        setThumbnails([...thumbs]);
      }
    });
  }

  // ── Select All / Deselect All ──────────────────────────────────────────────

  function handleSelectAll() {
    setSelectedIds(new Set(pageOrder.map((_, i) => i)));
  }

  function handleDeselectAll() {
    setSelectedIds(new Set());
  }

  function handleToggleSelect(idx: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    if (!pdfBytes || selectedIds.size === 0) return;
    // Prevent deleting all pages
    if (selectedIds.size >= pageOrder.length) return;

    const sortedIndices = Array.from(selectedIds).sort((a, b) => b - a); // descending
    saveHistory(pdfBytes, thumbnails, pageOrder, rotations);

    let newBytes = pdfBytes;
    let newOrder = [...pageOrder];
    let newThumbs = [...thumbnails];
    let newRotations = [...rotations];

    // Delete from highest index to lowest to avoid index shifting
    for (const idx of sortedIndices) {
      const pageIdx = newOrder[idx];
      try {
        newBytes = await deletePages(newBytes, [pageIdx]);
        // After deletion, all page indices > pageIdx shift down by 1
        newOrder = newOrder
          .filter((_, i) => i !== idx)
          .map((p) => (p > pageIdx ? p - 1 : p));
        newThumbs = newThumbs.filter((_, i) => i !== idx);
        newRotations = newRotations.filter((_, i) => i !== idx);
      } catch (e) {
        failSession(e instanceof Error ? e.message : "Bulk delete failed.");
        return;
      }
    }

    setPdfBytes(newBytes);
    setPageOrder(newOrder);
    setThumbnails(newThumbs);
    setRotations(newRotations);
    setSelectedIds(new Set());
  }

  async function handleBulkRotateLeft() {
    if (!pdfBytes || selectedIds.size === 0) return;
    saveHistory(pdfBytes, thumbnails, pageOrder, rotations);
    const indices = Array.from(selectedIds);
    const pageIndices = indices.map((i) => pageOrder[i]);
    try {
      const newBytes = await rotatePages(
        pdfBytes,
        pageIndices.map((pageIdx) => ({ pageIndex: pageIdx, degrees: 270 })),
      );
      setPdfBytes(newBytes);
      // Refresh thumbnails for rotated pages
      const newThumbs = [...thumbnails];
      const newRotations = [...rotations];
      for (const orderIdx of indices) {
        const pageIdx = pageOrder[orderIdx];
        newThumbs[orderIdx] = await renderThumbnail(newBytes, pageIdx);
        newRotations[orderIdx] = (newRotations[orderIdx] + 270) % 360;
      }
      setThumbnails(newThumbs);
      setRotations(newRotations);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Bulk rotate left failed.");
    }
  }

  async function handleBulkRotateRight() {
    if (!pdfBytes || selectedIds.size === 0) return;
    saveHistory(pdfBytes, thumbnails, pageOrder, rotations);
    const indices = Array.from(selectedIds);
    const pageIndices = indices.map((i) => pageOrder[i]);
    try {
      const newBytes = await rotatePages(
        pdfBytes,
        pageIndices.map((pageIdx) => ({ pageIndex: pageIdx, degrees: 90 })),
      );
      setPdfBytes(newBytes);
      // Refresh thumbnails for rotated pages
      const newThumbs = [...thumbnails];
      const newRotations = [...rotations];
      for (const orderIdx of indices) {
        const pageIdx = pageOrder[orderIdx];
        newThumbs[orderIdx] = await renderThumbnail(newBytes, pageIdx);
        newRotations[orderIdx] = (newRotations[orderIdx] + 90) % 360;
      }
      setThumbnails(newThumbs);
      setRotations(newRotations);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Bulk rotate right failed.");
    }
  }

  // ── Delete page ────────────────────────────────────────────────────────────

  async function handleDeletePage(orderIdx: number) {
    if (!pdfBytes) return;
    const pageIdx = pageOrder[orderIdx];
    try {
      saveHistory(pdfBytes, thumbnails, pageOrder, rotations);
      const newBytes = await deletePages(pdfBytes, [pageIdx]);
      const newOrder = pageOrder.filter((_, i) => i !== orderIdx);
      const newThumbs = thumbnails.filter((_, i) => i !== orderIdx);
      const newRotations = rotations.filter((_, i) => i !== orderIdx);
      setPdfBytes(newBytes);
      setPageOrder(newOrder);
      setThumbnails(newThumbs);
      setRotations(newRotations);
      // Remove from selection if selected
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(orderIdx);
        return next;
      });
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
      saveHistory(pdfBytes, thumbnails, pageOrder, rotations);
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
      setRotations((prev) => {
        const next = [...prev];
        next[orderIdx] = (next[orderIdx] + deg) % 360;
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
      saveHistory(pdfBytes, thumbnails, pageOrder, rotations);
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

      // Rebuild thumbnails and rotations
      const newThumbs: string[] = [];
      for (let i = 0; i < newPageCount; i++) {
        newThumbs.push(await renderThumbnail(newBytes, i));
      }

      // Insert rotation for the duplicated page (same as original)
      const newRotations = [...rotations];
      newRotations.splice(orderIdx + 1, 0, rotations[orderIdx] ?? 0);

      setPdfBytes(newBytes);
      setPageOrder(newOrder);
      setThumbnails(newThumbs);
      setRotations(newRotations);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Duplicate page failed.");
    }
  }

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────

  async function handleThumbDrop(targetIdx: number) {
    if (dragSrc === null || dragSrc === targetIdx || !pdfBytes) return;
    saveHistory(pdfBytes, thumbnails, pageOrder, rotations);
    const newOrder = [...pageOrder];
    const [moved] = newOrder.splice(dragSrc, 1);
    newOrder.splice(targetIdx, 0, moved);

    const newThumbs = [...thumbnails];
    const [movedThumb] = newThumbs.splice(dragSrc, 1);
    newThumbs.splice(targetIdx, 0, movedThumb);

    const newRotations = [...rotations];
    const [movedRot] = newRotations.splice(dragSrc, 1);
    newRotations.splice(targetIdx, 0, movedRot);

    try {
      const newBytes = await reorderPages(pdfBytes, newOrder);
      // After reorder, page indices in the new PDF are 0..n-1 in the new order
      const resetOrder = newOrder.map((_, i) => i);
      setPdfBytes(newBytes);
      setPageOrder(resetOrder);
      setThumbnails(newThumbs);
      setRotations(newRotations);
    } catch (e) {
      failSession(e instanceof Error ? e.message : "Reorder failed.");
    }
    setDragSrc(null);
    setDragOver(null);
    setDropIndex(null);
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
    setSelectedIds(new Set());
    setRotations([]);
    setDropIndex(null);
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
    dropIndex,
    setDropIndex,
    selectedIds,
    handleSelectAll,
    handleDeselectAll,
    handleToggleSelect,
    rotations,
    history,
    handleUndo,
    handleFileDrop,
    handleDeletePage,
    handleRotatePage,
    handleDuplicatePage,
    handleThumbDrop,
    handleBulkDelete,
    handleBulkRotateLeft,
    handleBulkRotateRight,
    handleSave,
    handleReset,
  };
}
