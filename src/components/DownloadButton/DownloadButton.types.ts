export interface DownloadButtonProps {
  blobUrl: string | null;
  filename: string;
  onDownloadComplete: () => void;
  disabled?: boolean;
}
