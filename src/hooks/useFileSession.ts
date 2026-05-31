/**
 * useFileSession — shared hook for file selection, validation, preview
 * generation, and session lifecycle management.
 *
 * Replaces the ad-hoc file loading scattered across individual tool hooks.
 * Calls getPageSizes() so CoordinateMapper always has real page dimensions.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 21.3, 21.4
 */

import { useState, useCallback, useRef } from "react";
import { validateFile } from "@/lib/file-validator";
import { FileTooLargeError, ValidationError } from "@/lib/errors";
import {
  getPageSizes,
  getPageCount,
  renderPagePreview,
  renderThumbnail,
} from "@/engines/pdf-engine";
import { useAuroraStore } from "@/stores/aurora.store";

export interface FileSessionOptions {
  /** Accepted MIME types and file extensions. */
  accept: Array<{ mime: string; extension: string }>;
  /** Maximum file size in MB. Defaults to 100 MB. */
  maxSizeMb?: number;
  /** Render a page-1 thumbnail data URL. */
  generatePreview?: boolean;
  /** Render data URLs for all pages (for editor tools). */
  generateAllPreviews?: boolean;
}

export interface FileSessionResult {
  file: File | null;
  bytes: Uint8Array | null;
  pageCount: number;
  /** Page 1 data URL (set when generatePreview or generateAllPreviews is true). */
  preview: string | null;
  /** All-pages data URLs (set when generateAllPreviews is true). */
  allPreviews: string[];
  /** Actual PDF page dimensions from getPageSizes() — used by CoordinateMapper. */
  pageDimensions: Array<{ width: number; height: number }>;
  /** Drop handler — pass the files array from FileDropZone. */
  handleDrop: (files: File[]) => void;
  /** Reset all session state and revoke any object URLs. */
  reset: () => void;
  /** True while async loading/preview generation is in progress. */
  isLoading: boolean;
}

export function useFileSession(opts: FileSessionOptions): FileSessionResult {
  const {
    maxSizeMb = 100,
    generatePreview = false,
    generateAllPreviews = false,
  } = opts;

  const { failSession, clearWorkbox } = useAuroraStore();

  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [allPreviews, setAllPreviews] = useState<string[]>([]);
  const [pageDimensions, setPageDimensions] = useState<
    Array<{ width: number; height: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track object URLs created for preview blobs so we can revoke them on reset.
  const previewUrlsRef = useRef<string[]>([]);

  const revokePreviewUrls = useCallback(() => {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = [];
  }, []);

  const handleDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const dropped = files[0];

      // Validate file type and size
      const validation = validateFile(dropped, opts.accept, maxSizeMb);
      if (!validation.valid) {
        const isSizeError =
          validation.errorMessage?.includes("max allowed") ?? false;
        if (isSizeError) {
          const sizeMb = dropped.size / 1024 / 1024;
          failSession(new FileTooLargeError(sizeMb, maxSizeMb).message);
        } else {
          failSession(
            new ValidationError(validation.errorMessage ?? "Invalid file.")
              .message,
          );
        }
        return;
      }

      setIsLoading(true);
      revokePreviewUrls();

      try {
        // Read file bytes
        const fileBytes = new Uint8Array(await dropped.arrayBuffer());

        // Get page count
        const count = await getPageCount(fileBytes);

        // Get real page dimensions — CoordinateMapper depends on these
        const dims = await getPageSizes(fileBytes);

        // Generate previews as requested
        let page1Preview: string | null = null;
        const pages: string[] = [];

        if (generateAllPreviews) {
          // Render all pages (capped at 50 to avoid memory exhaustion)
          const limit = Math.min(count, 50);
          for (let i = 0; i < limit; i++) {
            const dataUrl = await renderPagePreview(fileBytes, i);
            pages.push(dataUrl);
          }
          page1Preview = pages[0] ?? null;
        } else if (generatePreview) {
          // Render page 1 only
          page1Preview = await renderThumbnail(fileBytes, 0);
        }

        // Commit state
        setFile(dropped);
        setBytes(fileBytes);
        setPageCount(count);
        setPageDimensions(dims);
        setPreview(page1Preview);
        setAllPreviews(pages);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load PDF.";
        failSession(message);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      opts.accept,
      maxSizeMb,
      generatePreview,
      generateAllPreviews,
      failSession,
      revokePreviewUrls,
    ],
  );

  const reset = useCallback(() => {
    revokePreviewUrls();
    clearWorkbox();
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setPreview(null);
    setAllPreviews([]);
    setPageDimensions([]);
    setIsLoading(false);
  }, [clearWorkbox, revokePreviewUrls]);

  return {
    file,
    bytes,
    pageCount,
    preview,
    allPreviews,
    pageDimensions,
    handleDrop,
    reset,
    isLoading,
  };
}
