import { useRef, useState } from "react";
import { ClearModal } from "@/components/ClearModal/ClearModal";
import type { DownloadButtonProps } from "./DownloadButton.types";

export function DownloadButton({
  blobUrl,
  filename,
  onDownloadComplete,
  disabled = false,
}: DownloadButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [showModal, setShowModal] = useState(false);
  const isDisabled = disabled || !blobUrl;

  function handleClick() {
    if (!blobUrl || isDisabled) return;
    // Trigger the actual browser download immediately
    anchorRef.current?.click();
    // Show the animated modal
    setShowModal(true);
  }

  function handleModalComplete() {
    setShowModal(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    onDownloadComplete();
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
      {showModal && filename && (
        <ClearModal filename={filename} onComplete={handleModalComplete} />
      )}
    </>
  );
}
