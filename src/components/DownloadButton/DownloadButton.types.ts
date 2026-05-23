export interface DownloadButtonProps {
  blobUrl: string | null;
  filename: string;
  onDownloadComplete: () => void;
  disabled?: boolean;
  /** Tool name for analytics (e.g. "compress", "ocr"). Defaults to "unknown". */
  tool?: string;
}
