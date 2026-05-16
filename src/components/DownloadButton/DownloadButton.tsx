import { useRef } from "react";
import type { DownloadButtonProps } from "./DownloadButton.types";

export function DownloadButton({
  blobUrl,
  filename,
  onDownloadComplete,
  disabled = false,
}: DownloadButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const isDisabled = disabled || !blobUrl;

  function handleClick() {
    if (!blobUrl || isDisabled) return;
    anchorRef.current?.click();
    setTimeout(onDownloadComplete, 2000);
  }

  return (
    <>
      <a
        ref={anchorRef}
        href={blobUrl ?? "#"}
        download={filename}
        style={{ display: "none" }}
        aria-hidden="true"
      />
      <button
        className="btn btn-primary btn-lg"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={`Download ${filename}`}
      >
        ⬇ Download {filename}
      </button>
    </>
  );
}
