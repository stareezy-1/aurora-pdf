import type { AcceptedFileType } from "@/lib/file-validator";

export interface FileDropZoneProps {
  accept: AcceptedFileType[];
  multiple?: boolean;
  maxSizeMb?: number;
  onFilesAccepted: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  /** Tool name for analytics (e.g. "compress", "ocr"). Defaults to "unknown". */
  tool?: string;
}
