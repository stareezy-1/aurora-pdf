/**
 * useImageToPdf — hook for the Image to PDF tool.
 * Multi-image reorderable list, page size + orientation, Worker conversion.
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { useState, useCallback } from "react";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  imagesToPdf,
  type ImagePageSize,
  type ImageOrientation,
} from "@/engines/conversion-engine";

const IMAGE_ACCEPT = [
  { mime: "image/png", extension: ".png" },
  { mime: "image/jpeg", extension: ".jpg" },
  { mime: "image/jpeg", extension: ".jpeg" },
  { mime: "image/webp", extension: ".webp" },
];

export interface ImageEntry {
  id: string;
  file: File;
  dataUrl: string;
}

export function useImageToPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
  } = useAuroraStore();

  const [images, setImages] = useState<ImageEntry[]>([]);
  const [pageSize, setPageSize] = useState<ImagePageSize>("A4");
  const [orientation, setOrientation] = useState<ImageOrientation>("portrait");
  const [isPending, setIsPending] = useState(false);

  const { setNewFile, updateProgress, setComplete, failSession } =
    useAuroraStore();

  const handleFileDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const newEntries: ImageEntry[] = [];
    for (const f of files) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(f);
      });
      newEntries.push({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        dataUrl,
      });
    }

    setImages((prev) => [...prev, ...newEntries]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const handleApply = useCallback(async () => {
    if (images.length === 0) {
      failSession("Please add at least one image.");
      return;
    }
    setIsPending(true);
    // Use first image's file as the "source" for naming
    setNewFile(images[0].file);

    try {
      const dataUrls = images.map((img) => img.dataUrl);
      const pdfBytes = await imagesToPdf(
        dataUrls,
        pageSize,
        orientation,
        (pct, label) => updateProgress(pct, label),
      );

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setComplete(blob, "images.pdf");
    } catch (err) {
      failSession(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setIsPending(false);
    }
  }, [
    images,
    pageSize,
    orientation,
    setNewFile,
    updateProgress,
    setComplete,
    failSession,
  ]);

  const handleReset = useCallback(() => {
    useAuroraStore.getState().clearWorkbox();
    setImages([]);
    setIsPending(false);
  }, []);

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    images,
    pageSize,
    setPageSize,
    orientation,
    setOrientation,
    isPending,
    handleFileDrop,
    removeImage,
    moveImage,
    handleApply,
    handleReset,
    IMAGE_ACCEPT,
  };
}
