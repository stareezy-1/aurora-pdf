import type { SessionStatus } from "@/types/store.types";

export interface ProgressPanelProps {
  status: SessionStatus;
  progress: number;
  label?: string;
  errorMessage?: string;
  onRetry?: () => void;
  /** When true, renders a full-width shimmer bar instead of the percentage fill bar */
  indeterminate?: boolean;
  /** When true, renders a reassurance message about local processing */
  showReassurance?: boolean;
  /** Tool name used for the tab title during processing */
  toolName?: string;
}
