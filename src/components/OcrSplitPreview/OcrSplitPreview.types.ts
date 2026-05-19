export interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

export interface OcrSplitPreviewPage {
  pageIndex: number;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  words: OcrWord[];
}

export interface OcrSplitPreviewProps {
  pages: OcrSplitPreviewPage[];
  currentPage: number;
  onPageChange: (page: number) => void;
}
