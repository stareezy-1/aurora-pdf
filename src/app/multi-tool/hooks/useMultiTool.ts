/**
 * useMultiTool — hook for the PDF Multi Tool.
 * Draggable thumbnail grid; operations: reorder, delete, rotate, duplicate,
 * extract, insert, add blank; single-pass Worker export.
 * Requirements: 60.1, 60.2, 60.3, 60.4
 */

import { useState, useCallback, useEffect } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { PDFDocument, degrees } from "pdf-lib";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface MultiToolPage {
  /** Original 0-based page index in the source PDF */
  srcIndex: number;
  /** Unique key for React rendering */
  key: string;
  /** Cumulative rotation in degrees (0/90/180/270) */
  rotation: number;
  /** Thumbnail data URL */
  thumb: string;
}

export function useMultiTool() {
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
    generateAllPreviews: true,
  });

  const [pages, setPages] = useState<MultiToolPage[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Sync pages when file loads
  useEffect(() => {
    if (session.allPreviews.length > 0) {
      setPages(
        session.allPreviews.map((thumb, i) => ({
          srcIndex: i,
          key: crypto.randomUUID(),
          rotation: 0,
          thumb,
        })),
      );
      setSelectedKeys(new Set());
    }
  }, [session.allPreviews]);

  const processor = usePdfProcessor<MultiToolPage[]>({
    processFn: async (bytes, pageList, onProgress) => {
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      const total = pageList.length;

      for (let i = 0; i < total; i++) {
        onProgress(
          Math.round((i / total) * 90),
          `Processing page ${i + 1} of ${total}…`,
        );
        const pg = pageList[i];

        if (pg.srcIndex === -1) {
          // Blank page — use A4 dimensions
          out.addPage([595.28, 841.89]);
        } else {
          const [copied] = await out.copyPages(src, [pg.srcIndex]);
          if (pg.rotation !== 0) {
            copied.setRotation(degrees(pg.rotation));
          }
          out.addPage(copied);
        }
      }

      onProgress(95, "Saving…");
      const result = await out.save();
      onProgress(100, "Done");
      return result;
    },
    outputSuffix: "multi",
  });

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(pages.map((p) => p.key)));
  }, [pages]);

  const deselectAll = useCallback(() => setSelectedKeys(new Set()), []);

  // ── Page operations ────────────────────────────────────────────────────────

  const deletePage = useCallback((key: string) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.key !== key);
    });
    setSelectedKeys((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    setPages((prev) => {
      const remaining = prev.filter((p) => !selectedKeys.has(p.key));
      if (remaining.length === 0) return prev; // keep at least 1
      return remaining;
    });
    setSelectedKeys(new Set());
  }, [selectedKeys]);

  const rotatePage = useCallback((key: string, deg: 90 | 180 | 270) => {
    setPages((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, rotation: (p.rotation + deg) % 360 } : p,
      ),
    );
  }, []);

  const rotateSelected = useCallback(
    (deg: 90 | 180 | 270) => {
      setPages((prev) =>
        prev.map((p) =>
          selectedKeys.has(p.key)
            ? { ...p, rotation: (p.rotation + deg) % 360 }
            : p,
        ),
      );
    },
    [selectedKeys],
  );

  const duplicatePage = useCallback((key: string) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.key === key);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], key: crypto.randomUUID() };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const addBlankPage = useCallback((afterKey: string) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.key === afterKey);
      const blank: MultiToolPage = {
        srcIndex: -1,
        key: crypto.randomUUID(),
        rotation: 0,
        thumb: "",
      };
      const next = [...prev];
      next.splice(idx + 1, 0, blank);
      return next;
    });
  }, []);

  // ── Drag-and-drop reorder ──────────────────────────────────────────────────

  const handleDragStart = useCallback((idx: number) => {
    setDragSrc(idx);
    setDropIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOver(idx);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    setDropIndex(e.clientX < midX ? idx : idx + 1);
  }, []);

  const handleDrop = useCallback(
    (_idx: number) => {
      if (dragSrc === null || dropIndex === null) return;
      setPages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragSrc, 1);
        const insertAt = dropIndex > dragSrc ? dropIndex - 1 : dropIndex;
        next.splice(insertAt, 0, moved);
        return next;
      });
      setDragSrc(null);
      setDragOver(null);
      setDropIndex(null);
    },
    [dragSrc, dropIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDragSrc(null);
    setDragOver(null);
    setDropIndex(null);
  }, []);

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    if (!session.file || pages.length === 0) return;
    processor.run(session.file, pages);
  }, [session.file, pages, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setPages([]);
    setSelectedKeys(new Set());
  }, [session]);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    file: session.file,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    pages,
    selectedKeys,
    dragSrc,
    dragOver,
    dropIndex,
    toggleSelect,
    selectAll,
    deselectAll,
    deletePage,
    deleteSelected,
    rotatePage,
    rotateSelected,
    duplicatePage,
    addBlankPage,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleExport,
    handleReset,
    PDF_ACCEPT,
  };
}
