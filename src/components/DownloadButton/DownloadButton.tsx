import { useRef, useState } from "react";
import { ClearModal } from "@/components/ClearModal/ClearModal";
import type { DownloadButtonProps } from "./DownloadButton.types";
import { trackEvent } from "@/lib/analytics";

export function DownloadButton({
  blobUrl,
  filename,
  onDownloadComplete,
  disabled = false,
  tool = "unknown",
}: DownloadButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [showModal, setShowModal] = useState(false);
  const isDisabled = disabled || !blobUrl;

  function handleClick() {
    if (!blobUrl || isDisabled) return;
    anchorRef.current?.click();
    setShowModal(true);

    // Analytics: track download
    trackEvent({
      name: "file_downloaded",
      tool,
      outputSizeMb: 0, // size not available here; tracked in PrivacyShield
    });
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
