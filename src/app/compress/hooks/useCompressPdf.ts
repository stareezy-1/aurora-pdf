/**
 * useCompressPdf — upgraded hook for the Compress PDF tool.
 *
 * Migrated from useFileProcessor to useFileSession + usePdfProcessor.
 * Manages:
 *   - Algorithm state (condense / photon)
 *   - Condense level state (low / recommended / high / maximum / custom)
 *   - Preset state (email / web / mobile / print / maximum)
 *   - Batch files state (up to 10 files)
 *   - Photon warning modal state
 *   - Compression stats after processing
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.12, 2.13, 2.14, 2.17, 2.18
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import {
  compressPdf,
  estimateCompression,
  batchCompress,
  BATCH_MAX_FILES,
  LARGE_FILE_THRESHOLD_BYTES,
} from "@/engines/compression-engine";
import { COMPRESSION_PRESETS } from "@/types/compression.types";
import type {
  CompressionConfig,
  CompressionAlgorithm,
  CondenseLevel,
  PresetName,
} from "@/types/compression.types";
import type { BatchFile } from "@/types/tool.types";
import { useAuroraStore } from "@/stores/aurora.store";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

/** Build a full CondenseConfig for a given level with sensible defaults. */
function defaultCondenseConfig(level: CondenseLevel): CompressionConfig {
  switch (level) {
    case "low":
      return {
        algorithm: "condense",
        condense: {
          level: "low",
          optimizeJpeg: false,
          convertPngToJpeg: false,
          targetDpi: null,
          removeMetadata: false,
          removeThumbnails: false,
          subsetFonts: false,
          removeUnusedObjects: true,
          greyscale: false,
        },
      };
    case "recommended":
      return {
        algorithm: "condense",
        condense: {
          level: "recommended",
          optimizeJpeg: true,
          convertPngToJpeg: false,
          targetDpi: null,
          removeMetadata: false,
          removeThumbnails: true,
          subsetFonts: true,
          removeUnusedObjects: true,
          greyscale: false,
        },
      };
    case "high":
      return {
        algorithm: "condense",
        condense: {
          level: "high",
          optimizeJpeg: true,
          convertPngToJpeg: true,
          targetDpi: 150,
          removeMetadata: false,
          removeThumbnails: true,
          subsetFonts: true,
          removeUnusedObjects: true,
          greyscale: false,
        },
      };
    case "maximum":
      return {
        algorithm: "condense",
        condense: {
          level: "maximum",
          optimizeJpeg: true,
          convertPngToJpeg: true,
          targetDpi: 96,
          removeMetadata: true,
          removeThumbnails: true,
          subsetFonts: true,
          removeUnusedObjects: true,
          greyscale: false,
        },
      };
    case "custom":
    default:
      return {
        algorithm: "condense",
        condense: {
          level: "custom",
          optimizeJpeg: true,
          convertPngToJpeg: false,
          targetDpi: null,
          removeMetadata: false,
          removeThumbnails: false,
          subsetFonts: true,
          removeUnusedObjects: true,
          greyscale: false,
          jpegQuality: 0.65,
        },
      };
  }
}

export function useCompressPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  // ── Algorithm & level state ──────────────────────────────────────────────
  const [algorithm, setAlgorithmState] =
    useState<CompressionAlgorithm>("condense");
  const [condenseLevel, setCondenseLevelState] =
    useState<CondenseLevel>("recommended");
  const [photonDpi, setPhotonDpi] = useState<72 | 96 | 150 | 300>(150);
  const [photonGreyscale, setPhotonGreyscale] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetName | null>(null);

  // ── Photon warning modal ─────────────────────────────────────────────────
  const [photonWarningAcknowledged, setPhotonWarningAcknowledged] =
    useState(false);
  const [showPhotonWarning, setShowPhotonWarning] = useState(false);
  const [pendingPhotonRun, setPendingPhotonRun] = useState(false);

  // ── Compression stats ────────────────────────────────────────────────────
  const [stats, setStats] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [noReduction, setNoReduction] = useState(false);

  /**
   * Capture the compressed output size from inside processFn.
   * processFn runs asynchronously; we write the result size here so the
   * useEffect below can read it when status flips to "success".
   */
  const pendingStatsRef = useRef<{
    original: number;
    compressed: number;
  } | null>(null);

  // When the store status transitions to "success", commit the pending stats.
  useEffect(() => {
    if (status === "success" && pendingStatsRef.current) {
      const { original, compressed } = pendingStatsRef.current;
      pendingStatsRef.current = null;
      setNoReduction(compressed >= original);
      setStats({ original, compressed });
    }
    if (status === "idle" || status === "error") {
      pendingStatsRef.current = null;
    }
  }, [status]);

  // ── Batch mode ───────────────────────────────────────────────────────────
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchZipUrl, setBatchZipUrl] = useState<string | null>(null);
  const [batchComplete, setBatchComplete] = useState(false);

  // ── File session (single file mode) ─────────────────────────────────────
  const session = useFileSession({
    accept: PDF_ACCEPT,
    maxSizeMb: 100,
    generatePreview: true,
  });

  // ── Build current compression config ────────────────────────────────────
  const currentConfig = useMemo<CompressionConfig>(() => {
    if (algorithm === "photon") {
      return {
        algorithm: "photon",
        photon: { dpi: photonDpi, greyscale: photonGreyscale },
      };
    }
    return defaultCondenseConfig(condenseLevel);
  }, [algorithm, condenseLevel, photonDpi, photonGreyscale]);

  // ── Estimation (only for single file mode when file is loaded) ───────────
  const estimation = useMemo(() => {
    if (!session.bytes) return null;
    return estimateCompression(session.bytes, currentConfig);
  }, [session.bytes, currentConfig]);

  // ── usePdfProcessor ──────────────────────────────────────────────────────
  // processFn captures the original + compressed sizes into pendingStatsRef
  // so the useEffect above can commit them when status becomes "success".
  const processor = usePdfProcessor<{
    config: CompressionConfig;
    originalSize: number;
  }>({
    processFn: async (bytes, { config, originalSize }, onProgress) => {
      const result = await compressPdf(bytes, config, onProgress);
      // Write stats into the ref — the useEffect will pick them up.
      pendingStatsRef.current = {
        original: originalSize,
        compressed: result.byteLength,
      };
      return result;
    },
    outputSuffix: "compressed",
    outputMime: "application/pdf",
  });

  // ── Algorithm setter (with Photon warning) ───────────────────────────────
  const setAlgorithm = useCallback(
    (algo: CompressionAlgorithm) => {
      if (algo === "photon" && !photonWarningAcknowledged) {
        setShowPhotonWarning(true);
        return;
      }
      setAlgorithmState(algo);
      setSelectedPreset(null);
    },
    [photonWarningAcknowledged],
  );

  const acknowledgePhotonWarning = useCallback(() => {
    setPhotonWarningAcknowledged(true);
    setShowPhotonWarning(false);
    setAlgorithmState("photon");
    setSelectedPreset(null);
    if (pendingPhotonRun && session.file) {
      setPendingPhotonRun(false);
      const config: CompressionConfig = {
        algorithm: "photon",
        photon: { dpi: photonDpi, greyscale: photonGreyscale },
      };
      processor.run(session.file, { config, originalSize: session.file.size });
    }
    setPendingPhotonRun(false);
  }, [pendingPhotonRun, session.file, photonDpi, photonGreyscale, processor]);

  const dismissPhotonWarning = useCallback(() => {
    setShowPhotonWarning(false);
    setPendingPhotonRun(false);
  }, []);

  // ── Condense level setter ────────────────────────────────────────────────
  const setCondenseLevel = useCallback((level: CondenseLevel) => {
    setCondenseLevelState(level);
    setSelectedPreset(null);
  }, []);

  // ── Preset setter ────────────────────────────────────────────────────────
  const applyPreset = useCallback(
    (preset: PresetName) => {
      const config = COMPRESSION_PRESETS[preset];
      setSelectedPreset(preset);
      if (config.algorithm === "photon") {
        if (!photonWarningAcknowledged) {
          setShowPhotonWarning(true);
          return;
        }
        setAlgorithmState("photon");
        setPhotonDpi(config.photon.dpi);
        setPhotonGreyscale(config.photon.greyscale);
      } else {
        setAlgorithmState("condense");
        setCondenseLevelState(config.condense.level);
      }
    },
    [photonWarningAcknowledged],
  );

  // ── Single file run ──────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!session.file) return;

    if (currentConfig.algorithm === "photon" && !photonWarningAcknowledged) {
      setPendingPhotonRun(true);
      setShowPhotonWarning(true);
      return;
    }

    setStats(null);
    setNoReduction(false);
    processor.run(session.file, {
      config: currentConfig,
      originalSize: session.file.size,
    });
  }, [session.file, currentConfig, photonWarningAcknowledged, processor]);

  // ── Batch file drop ──────────────────────────────────────────────────────
  const handleBatchDrop = useCallback((files: File[]) => {
    const limited = files.slice(0, BATCH_MAX_FILES);
    const newBatchFiles: BatchFile[] = limited.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending" as const,
      progress: 0,
      resultBlobUrl: null,
      errorMessage: null,
      originalSize: file.size,
      compressedSize: null,
    }));
    setBatchFiles(newBatchFiles);
    setBatchComplete(false);
    setBatchZipUrl(null);
  }, []);

  const addBatchFiles = useCallback((files: File[]) => {
    setBatchFiles((prev) => {
      const remaining = BATCH_MAX_FILES - prev.length;
      if (remaining <= 0) return prev;
      const toAdd = files.slice(0, remaining).map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending" as const,
        progress: 0,
        resultBlobUrl: null,
        errorMessage: null,
        originalSize: file.size,
        compressedSize: null,
      }));
      return [...prev, ...toAdd];
    });
  }, []);

  const removeBatchFile = useCallback((id: string) => {
    setBatchFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ── Batch run ────────────────────────────────────────────────────────────
  const handleBatchRun = useCallback(async () => {
    if (batchFiles.length === 0) return;

    if (currentConfig.algorithm === "photon" && !photonWarningAcknowledged) {
      setPendingPhotonRun(true);
      setShowPhotonWarning(true);
      return;
    }

    setIsBatchProcessing(true);
    setBatchComplete(false);
    setBatchZipUrl(null);

    // Reset all to pending
    setBatchFiles((prev) =>
      prev.map((f) => ({
        ...f,
        status: "pending" as const,
        progress: 0,
        errorMessage: null,
      })),
    );

    try {
      const files = batchFiles.map((bf) => bf.file);
      const result = await batchCompress(
        files,
        currentConfig,
        (fileIndex, pct) => {
          setBatchFiles((prev) =>
            prev.map((f, i) => {
              if (i !== fileIndex) return f;
              return {
                ...f,
                status:
                  pct === 100 ? ("done" as const) : ("processing" as const),
                progress: pct,
              };
            }),
          );
        },
      );

      // Merge final result state back — use functional update to get fresh batchFiles
      setBatchFiles((prev) =>
        prev.map((bf, i) => {
          const rf = result.files[i];
          if (!rf) return bf;
          return {
            ...bf,
            status: rf.status,
            progress: rf.progress,
            resultBlobUrl: rf.resultBlobUrl,
            errorMessage: rf.errorMessage,
            compressedSize: rf.compressedSize,
          };
        }),
      );

      if (result.zipBlob) {
        setBatchZipUrl(URL.createObjectURL(result.zipBlob));
      }
      setBatchComplete(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Batch compression failed.";
      setBatchFiles((prev) =>
        prev.map((f) =>
          f.status === "processing"
            ? { ...f, status: "error" as const, errorMessage: msg }
            : f,
        ),
      );
    } finally {
      setIsBatchProcessing(false);
    }
  }, [batchFiles, currentConfig, photonWarningAcknowledged]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    session.reset();
    clearWorkbox();
    setStats(null);
    setNoReduction(false);
    setBatchFiles([]);
    setBatchComplete(false);
    setBatchZipUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [session, clearWorkbox]);

  // ── Large file warning ───────────────────────────────────────────────────
  const hasLargeFile = useMemo(() => {
    if (isBatchMode) {
      return batchFiles.some((f) => f.file.size > LARGE_FILE_THRESHOLD_BYTES);
    }
    return (session.file?.size ?? 0) > LARGE_FILE_THRESHOLD_BYTES;
  }, [isBatchMode, batchFiles, session.file]);

  return {
    // File session
    file: session.file,
    bytes: session.bytes,
    preview: session.preview,
    isLoading: session.isLoading,
    handleDrop: session.handleDrop,

    // Algorithm
    algorithm,
    setAlgorithm,
    condenseLevel,
    setCondenseLevel,
    photonDpi,
    setPhotonDpi,
    photonGreyscale,
    setPhotonGreyscale,

    // Preset
    selectedPreset,
    applyPreset,

    // Photon warning
    showPhotonWarning,
    acknowledgePhotonWarning,
    dismissPhotonWarning,

    // Config & estimation
    currentConfig,
    estimation,

    // Processing (single file)
    handleRun,
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    stats,
    noReduction,

    // Batch
    isBatchMode,
    setIsBatchMode,
    batchFiles,
    handleBatchDrop,
    addBatchFiles,
    removeBatchFile,
    handleBatchRun,
    isBatchProcessing,
    batchZipUrl,
    batchComplete,
    hasLargeFile,
    BATCH_MAX_FILES,

    // Reset
    handleReset,
  };
}
