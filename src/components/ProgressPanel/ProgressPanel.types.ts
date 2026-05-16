import type { SessionStatus } from "@/types/store.types";

export interface ProgressPanelProps {
  status: SessionStatus;
  progress: number;
  label?: string;
  errorMessage?: string;
  onRetry?: () => void;
}
