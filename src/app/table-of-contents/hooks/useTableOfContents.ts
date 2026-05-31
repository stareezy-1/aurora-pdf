/**
 * useTableOfContents — hook for the Table of Contents tool.
 * TOC from bookmark tree, position config, font/line-spacing config, Worker export.
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import {
  generateTableOfContents,
  type BookmarkNode,
  type TocConfig,
} from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

const DEFAULT_TOC_CONFIG: TocConfig = {
  insertAtPage: 0,
  fontFamily: "Helvetica",
  fontSize: 11,
  lineSpacing: 1.5,
};

export function useTableOfContents() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
  const [tocConfig, setTocConfig] = useState<TocConfig>(DEFAULT_TOC_CONFIG);

  const processor = usePdfProcessor<{
    bookmarks: BookmarkNode[];
    tocConfig: TocConfig;
  }>({
    processFn: async (bytes, { bookmarks: tree, tocConfig: cfg }) => {
      return generateTableOfContents(bytes, tree, cfg);
    },
    outputSuffix: "toc",
  });

  const updateConfig = useCallback((patch: Partial<TocConfig>) => {
    setTocConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const addBookmark = useCallback(() => {
    setBookmarks((prev) => [
      ...prev,
      { title: `Section ${prev.length + 1}`, pageIndex: 0 },
    ]);
  }, []);

  const updateBookmark = useCallback(
    (
      idx: number,
      patch: Partial<Pick<BookmarkNode, "title" | "pageIndex">>,
    ) => {
      setBookmarks((prev) =>
        prev.map((bm, i) => (i === idx ? { ...bm, ...patch } : bm)),
      );
    },
    [],
  );

  const deleteBookmark = useCallback((idx: number) => {
    setBookmarks((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleApply = useCallback(() => {
    if (!session.file || bookmarks.length === 0) return;
    processor.run(session.file, { bookmarks, tocConfig });
  }, [session.file, bookmarks, tocConfig, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setBookmarks([]);
    setTocConfig(DEFAULT_TOC_CONFIG);
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
    bookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    tocConfig,
    updateConfig,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
