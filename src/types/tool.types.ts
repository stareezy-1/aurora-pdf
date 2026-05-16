export type CompressionLevel = "low" | "standard" | "high";
export type OcrLanguage = string; // Tesseract.js language code
export type WatermarkPlacement = "diagonal" | "header" | "footer";
export type SignatureMethod = "draw" | "type" | "upload";
export type DpiOption = 150 | 300;
export type PageSize = "A4" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";

export interface WatermarkConfig {
  text: string; // 1–100 chars
  fontSize: number; // 8–144
  opacity: number; // 10–100 (percent)
  color: string; // hex color string
  rotation: number; // 0–360 degrees
  placement: WatermarkPlacement;
  fontFamily: string; // font family name
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
    text: "CONFIDENTIAL",
    fontSize: 48,
    opacity: 50,
    color: "#000000",
    rotation: 45,
    placement: "diagonal",
    fontFamily: "Helvetica",
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
