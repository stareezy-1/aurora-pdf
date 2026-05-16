import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { getPageCount, extractPages } from "@/engines/pdf-engine";
import { packageFilesAsZip } from "@/lib/zip-helper";
import { buildOutputFilename } from "@/lib/filename-utils";

export interface NamedRange {
  name: string;
  range: string;
}

export function parsePageRange(input: string, total: number): number[] | null {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const indices = new Set<number>();
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    const singleMatch = part.match(/^(\d+)$/);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      if (from < 1 || to > total || from > to) return null;
      for (let i = from; i <= to; i++) indices.add(i - 1);
    } else if (singleMatch) {
      const n = parseInt(singleMatch[1], 10);
      if (n < 1 || n > total) return null;
      indices.add(n - 1);
    } else return null;
  }
  return indices.size > 0 ? Array.from(indices).sort((a, b) => a - b) : null;
}

export function useSplitPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeInput, setRangeInput] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [namedRanges, setNamedRanges] = useState<NamedRange[]>([]);
  const [newRangeName, setNewRangeName] = useState("");

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ranges =
        namedRanges.length > 0
          ? namedRanges
          : [{ name: "split", range: rangeInput }];

      if (ranges.length === 1) {
        const indices = parsePageRange(ranges[0].range, pageCount);
        if (!indices) throw new Error("Invalid page range.");
        onProgress(50, "Extracting pages…");
        const result = await extractPages(bytes, indices);
        onProgress(100);
        return {
          blob: new Blob([result], { type: "application/pdf" }),
          filename: buildOutputFilename(file.name, "split"),
        };
      }

      const entries: { filename: string; data: Uint8Array }[] = [];
      for (let i = 0; i < ranges.length; i++) {
        onProgress(
          Math.round((i / ranges.length) * 90),
          `Extracting range ${i + 1} of ${ranges.length}…`,
        );
        const indices = parsePageRange(ranges[i].range, pageCount);
        if (!indices) throw new Error(`Invalid range: "${ranges[i].range}"`);
        const result = await extractPages(bytes, indices);
        entries.push({
          filename: `${ranges[i].name || `part${i + 1}`}.pdf`,
          data: result,
        });
      }
      onProgress(95, "Packaging ZIP…");
      const zip = await packageFilesAsZip(entries);
      return {
        blob: zip,
        filename: buildOutputFilename(file.name, "split-zip"),
      };
    },
  });

  async function handleFileDrop(files: File[]) {
    const file = files[0];
    setPdfFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const n = await getPageCount(bytes);
    setPageCount(n);
  }

  function handleRangeChange(val: string) {
    setRangeInput(val);
    if (!val.trim()) {
      setRangeError("");
      return;
    }
    setRangeError(
      parsePageRange(val, pageCount)
        ? ""
        : `Invalid range. Use "1-3, 5, 7-9" (max page: ${pageCount})`,
    );
  }

  function addNamedRange() {
    if (!rangeInput.trim() || rangeError) return;
    setNamedRanges((prev) => [
      ...prev,
      { name: newRangeName || `Part ${prev.length + 1}`, range: rangeInput },
    ]);
    setRangeInput("");
    setNewRangeName("");
  }

  function handleReset() {
    clearWorkbox();
    setPdfFile(null);
    setPageCount(0);
    setRangeInput("");
    setNamedRanges([]);
  }

  const canSplit =
    pdfFile && (namedRanges.length > 0 || (rangeInput.trim() && !rangeError));

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pdfFile,
    pageCount,
    rangeInput,
    rangeError,
    namedRanges,
    setNamedRanges,
    newRangeName,
    setNewRangeName,
    canSplit,
    processor,
    handleFileDrop,
    handleRangeChange,
    addNamedRange,
    handleReset,
  };
}
