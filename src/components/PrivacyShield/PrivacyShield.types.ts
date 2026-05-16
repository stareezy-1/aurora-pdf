import type { SessionStatus } from "@/types/store.types";

export interface PrivacyShieldProps {
  variant: "card" | "indicator";
  status: SessionStatus;
  outputFilename?: string;
  outputSizeBytes?: number;
  blobUrl?: string | null;
  onDownload?: () => void;
  onReset?: () => void;
}
