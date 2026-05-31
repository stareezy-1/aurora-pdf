export type CompressionAlgorithm = "condense" | "photon";

export type CondenseLevel =
  | "low"
  | "recommended"
  | "high"
  | "maximum"
  | "custom";

export interface CondenseConfig {
  level: CondenseLevel;
  optimizeJpeg: boolean;
  convertPngToJpeg: boolean;
  targetDpi: 72 | 96 | 150 | 300 | null;
  removeMetadata: boolean;
  removeThumbnails: boolean;
  subsetFonts: boolean;
  removeUnusedObjects: boolean;
  greyscale: boolean;
  jpegQuality?: number; // 0.0–1.0, custom level only
}

export interface PhotonConfig {
  dpi: 72 | 96 | 150 | 300;
  greyscale: boolean;
}

export type CompressionConfig =
  | { algorithm: "condense"; condense: CondenseConfig }
  | { algorithm: "photon"; photon: PhotonConfig };

export type PresetName = "email" | "web" | "mobile" | "print" | "maximum";

export const COMPRESSION_PRESETS: Record<PresetName, CompressionConfig> = {
  email: {
    algorithm: "condense",
    condense: {
      level: "high",
      optimizeJpeg: true,
      convertPngToJpeg: true,
      targetDpi: 150,
      removeMetadata: true,
      removeThumbnails: true,
      subsetFonts: true,
      removeUnusedObjects: true,
      greyscale: false,
    },
  },
  web: {
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
  },
  mobile: { algorithm: "photon", photon: { dpi: 96, greyscale: false } },
  print: {
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
  },
  maximum: { algorithm: "photon", photon: { dpi: 72, greyscale: true } },
};
