import type { SessionStatus } from "@/types/store.types";

export interface RelatedTool {
  path: string;
  label: string;
  icon: string;
}

export interface PrivacyShieldProps {
  variant: "card" | "indicator";
  status: SessionStatus;
  outputFilename?: string;
  outputSizeBytes?: number;
  blobUrl?: string | null;
  onDownload?: () => void;
  onReset?: () => void;
  /** Related tools to show in "Try another tool" section when status === 'success' */
  relatedTools?: RelatedTool[];
}
