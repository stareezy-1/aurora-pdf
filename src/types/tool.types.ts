export type CompressionLevel = "low" | "standard" | "high";
export type OcrLanguage = string; // Tesseract.js language code
export type WatermarkPlacement =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type SignatureMethod = "draw" | "type" | "upload";
export type DpiOption = 150 | 300;
export type PageSize = "A4" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";

export interface WatermarkConfig {
  type: "text" | "image";
  // Text watermark
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  // Image watermark
  imageDataUrl?: string;
  // Shared
  opacity: number; // 5–100
  rotation: number; // 0–360
  placement: WatermarkPlacement | "custom";
  customX?: number; // 0–100 percent
  customY?: number;
  tile: boolean;
  layer: "foreground" | "background";
  pageRange: string; // '' = all pages
}

export interface SignatureConfig {
  method: SignatureMethod;
  dataUrl: string | null; // canvas data URL or uploaded image data URL
  typedName: string | null;
  fontFamily: string | null; // font family for typed signature
  fontSize: number | null; // font size (pt) for typed signature
  pageIndex: number; // 0-based
  x: number; // position on page (0–1 normalized)
  y: number;
  width: number; // size on page (0–1 normalized)
  height: number;
}

export interface EditAction {
  type: "add-text" | "delete-page" | "reorder-pages";
  payload: unknown;
  timestamp: number;
}

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "top-center";

export type PageNumberFormat = "1" | "Page 1" | "1/N";

export interface PageNumberConfig {
  position: PageNumberPosition;
  format: PageNumberFormat;
  fontFamily: string;
  fontSize: number; // 8–144
  color: string; // hex color string
}

export interface ToolConfig {
  compressionLevel: CompressionLevel;
  ocrLanguage: OcrLanguage;
  dpi: DpiOption;
  watermark: WatermarkConfig;
  signature: SignatureConfig;
  pageRangeInput: string;
  namedRanges: Array<{ name: string; range: string }>;
  editHistory: EditAction[];
  editHistoryIndex: number; // pointer for undo
}

export const defaultToolConfig: ToolConfig = {
  compressionLevel: "standard",
  ocrLanguage: "eng",
  dpi: 150,
  watermark: {
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 48,
    opacity: 50,
    color: "#000000",
    rotation: 45,
    placement: "center",
    fontFamily: "Helvetica",
    tile: false,
    layer: "foreground",
    pageRange: "",
  },
  signature: {
    method: "draw",
    dataUrl: null,
    typedName: null,
    fontFamily: "Georgia",
    fontSize: 38,
    pageIndex: 0,
    x: 0.1,
    y: 0.8,
    width: 0.3,
    height: 0.1,
  },
  pageRangeInput: "",
  namedRanges: [],
  editHistory: [],
  editHistoryIndex: -1,
};

// ---------------------------------------------------------------------------
// New types for P1 engines
// ---------------------------------------------------------------------------

export interface SignaturePlacement {
  dataUrl: string;
  pageIndex: number;
  x: number; // PDF points
  y: number; // PDF points (bottom-up)
  width: number;
  height: number;
  opacity: number; // 10–100
  rotation: number; // 0–360
}

export interface SavedSignature {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export interface CropConfig {
  top: number; // points
  right: number;
  bottom: number;
  left: number;
  pageRange: string;
}

export interface HeaderFooterConfig {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  marginOffset: number; // points
  pageRange: string;
}

export interface BatchFile {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  progress: number;
  resultBlobUrl: string | null;
  errorMessage: string | null;
  originalSize: number;
  compressedSize: number | null;
}
