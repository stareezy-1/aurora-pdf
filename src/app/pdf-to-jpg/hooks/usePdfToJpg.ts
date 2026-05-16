import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { renderPageAsJpeg, getPageCount } from "@/engines/pdf-engine";
import { packageFilesAsZip } from "@/lib/zip-helper";
import {
  buildPageJpgFilename,
  buildPdfToJpgZipFilename,
} from "@/lib/filename-utils";
import type { DpiOption } from "@/types/tool.types";

export function usePdfToJpg() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [dpi, setDpi] = useState<DpiOption>(150);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const n = await getPageCount(bytes);

      if (n === 1) {
        onProgress(0, "Rendering page 1 of 1…");
        const blob = await renderPageAsJpeg(bytes, 0, dpi);
        onProgress(100);
        return { blob, filename: buildPageJpgFilename(file.name, 1) };
      }

      const entries: { filename: string; data: Uint8Array }[] = [];
      for (let i = 0; i < n; i++) {
        onProgress(Math.round((i / n) * 95), `Rendering page ${i + 1} of ${n}`);
        const blob = await renderPageAsJpeg(bytes, i, dpi);
        const data = new Uint8Array(await blob.arrayBuffer());
        entries.push({
          filename: buildPageJpgFilename(file.name, i + 1),
          data,
        });
      }
      onProgress(98, "Packaging ZIP…");
      const zip = await packageFilesAsZip(entries);
      return { blob: zip, filename: buildPdfToJpgZipFilename(file.name) };
    },
  });

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    dpi,
    setDpi,
    processor,
  };
}
