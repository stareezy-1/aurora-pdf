/**
 * useBookmarks — hook for the Edit Bookmarks tool.
 * Editable outline panel, add/rename/delete/reorder/nest (3 levels), Worker export.
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import {
  applyBookmarks,
  type BookmarkNode,
} from "@/engines/organization-engine";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function useBookmarks() {
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

  const processor = usePdfProcessor<BookmarkNode[]>({
    processFn: async (bytes, tree) => {
      return applyBookmarks(bytes, tree);
    },
    outputSuffix: "bookmarks",
  });

  // Add a top-level bookmark
  const addBookmark = useCallback(() => {
    setBookmarks((prev) => [
      ...prev,
      { title: `Bookmark ${prev.length + 1}`, pageIndex: 0, children: [] },
    ]);
  }, []);

  // Add a child bookmark (up to 3 levels deep)
  const addChild = useCallback((path: number[]) => {
    setBookmarks((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as BookmarkNode[];
      let node: BookmarkNode | undefined;
      let arr = next;
      for (const idx of path) {
        node = arr[idx];
        arr = node?.children ?? [];
      }
      if (node && path.length < 3) {
        if (!node.children) node.children = [];
        node.children.push({
          title: `Bookmark ${node.children.length + 1}`,
          pageIndex: 0,
        });
      }
      return next;
    });
  }, []);

  // Update a bookmark's title or pageIndex
  const updateBookmark = useCallback(
    (
      path: number[],
      patch: Partial<Pick<BookmarkNode, "title" | "pageIndex">>,
    ) => {
      setBookmarks((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as BookmarkNode[];
        let arr = next;
        for (let i = 0; i < path.length - 1; i++) {
          arr = arr[path[i]]?.children ?? [];
        }
        const node = arr[path[path.length - 1]];
        if (node) Object.assign(node, patch);
        return next;
      });
    },
    [],
  );

  // Delete a bookmark by path
  const deleteBookmark = useCallback((path: number[]) => {
    setBookmarks((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as BookmarkNode[];
      let arr = next;
      for (let i = 0; i < path.length - 1; i++) {
        arr = arr[path[i]]?.children ?? [];
      }
      arr.splice(path[path.length - 1], 1);
      return next;
    });
  }, []);

  // Move a bookmark up or down within its sibling list
  const moveBookmark = useCallback(
    (path: number[], direction: "up" | "down") => {
      setBookmarks((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as BookmarkNode[];
        let arr = next;
        for (let i = 0; i < path.length - 1; i++) {
          arr = arr[path[i]]?.children ?? [];
        }
        const idx = path[path.length - 1];
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= arr.length) return prev;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        return next;
      });
    },
    [],
  );

  const handleApply = useCallback(() => {
    if (!session.file) return;
    processor.run(session.file, bookmarks);
  }, [session.file, bookmarks, processor]);

  const handleReset = useCallback(() => {
    session.reset();
    setBookmarks([]);
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
    addChild,
    updateBookmark,
    deleteBookmark,
    moveBookmark,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
