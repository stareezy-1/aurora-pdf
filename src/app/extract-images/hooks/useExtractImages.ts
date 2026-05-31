/**
 * useExtractImages — hook for the Extract Images tool.
 * Image gallery preview with dimensions/format, Worker extraction, ZIP download.
 * Requirements: 48.1, 48.2, 48.3, 48.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  extractImages,
  type ExtractedImage,
} from "@/engines/conversion-engine";
import { packageFilesAsZip } from "@/lib/zip-helper";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export interface ImagePreview {
  filename: string;
  dataUrl: string;
  sizeBytes: number;
  format: string;
}

export function useExtractImages() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  const [isPending, setIsPending] = useState(false);
  const [extractedPreviews, setExtractedPreviews] = useState<ImagePreview[]>(
    [],
  );

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleApply = useCallback(async () => {
    if (!session.file || !session.bytes) return;
    setIsPending(true);
    setExtractedPreviews([]);
    setNewFile(session.file);

    try {
      const results: ExtractedImage[] = await extractImages(
        session.bytes,
        (pct, label) => updateProgress(pct, label),
      );

      if (results.length === 0) {
        failSession("No embedded images found in this PDF.");
        return;
      }

      // Build preview data URLs for gallery
      const previews: ImagePreview[] = results.map((r) => {
        const isJpeg = r.filename.endsWith(".jpg");
        const mime = isJpeg ? "image/jpeg" : "image/png";
        const b64 = btoa(String.fromCharCode(...r.data));
        return {
          filename: r.filename,
          dataUrl: `data:${mime};base64,${b64}`,
          sizeBytes: r.data.length,
          format: isJpeg ? "JPEG" : "PNG",
        };
      });
      setExtractedPreviews(previews);

      updateProgress(98, "Creating ZIP…");
      const zipBlob = await packageFilesAsZip(results);
      const base = session.file.name.replace(/\.pdf$/i, "");
      setComplete(zipBlob, `${base}_images.zip`);
    } catch (err) {
      failSession(
        err instanceof Error ? err.message : "Image extraction failed.",
      );
    } finally {
      setIsPending(false);
    }
  }, [
    session.file,
    session.bytes,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setExtractedPreviews([]);
    setIsPending(false);
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
    extractedPreviews,
    isPending,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
