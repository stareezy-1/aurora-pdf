import { useRef, useState, useCallback, useEffect } from "react";
import { validateFile } from "@/lib/file-validator";
import type { FileDropZoneProps } from "./FileDropZone.types";

const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

export function FileDropZone({
  accept,
  multiple = false,
  maxSizeMb = 100,
  onFilesAccepted,
  onError,
  disabled = false,
  "aria-label": ariaLabel = "File drop zone",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejectedType, setRejectedType] = useState(false);
  const [dropped, setDropped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (dropTimeoutRef.current) clearTimeout(dropTimeoutRef.current);
    };
  }, []);

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files);
      const toProcess = multiple ? arr : [arr[0]];
      for (const file of toProcess) {
        const result = validateFile(file, accept, maxSizeMb);
        if (!result.valid) {
          onError(result.errorMessage ?? "Invalid file.");
          return;
        }
      }
      onFilesAccepted(toProcess);
    },
    [accept, maxSizeMb, multiple, onFilesAccepted, onError],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);

    // Check if dragged MIME type matches any accepted type
    const item = e.dataTransfer.items[0];
    if (item) {
      const draggedMime = item.type;
      const mimeAccepted = accept.some((a) => a.mime === draggedMime);
      setRejectedType(!mimeAccepted);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    setRejectedType(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setRejectedType(false);

    if (!disabled) {
      // Brief scale-down bounce
      setDropped(true);
      dropTimeoutRef.current = setTimeout(() => setDropped(false), 150);
      processFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = "";
  };

  const acceptStr = [...new Set(accept.map((a) => a.mime))].join(",");
  const extList = [...new Set(accept.map((a) => a.extension))].join(", ");

  // Compute border/background based on state
  let borderColor = "var(--border-2)";
  let borderStyle = "dashed";
  let bgColor = "var(--surface)";
  let boxShadow = "none";
  let scaleTransform = "scale(1)";

  if (rejectedType) {
    borderColor = "var(--red)";
    borderStyle = "solid";
    bgColor = "rgba(239,68,68,0.06)";
  } else if (isDragging) {
    borderColor = "var(--green)";
    borderStyle = "solid";
    bgColor = "rgba(0,255,136,0.06)";
    boxShadow = "var(--glow-green)";
    scaleTransform = "scale(1.025)";
  }

  if (dropped) {
    scaleTransform = "scale(0.97)";
  }

  const icon = rejectedType ? "🚫" : isDragging ? "📂" : "📄";
  const ctaText = isDragging
    ? "Drop to upload"
    : isTouch
    ? "Tap to select a file"
    : "Drag & drop or click to select";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 180,
        borderRadius: "var(--radius-xl)",
        padding: 32,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s",
        background: bgColor,
        border: `2px ${borderStyle} ${borderColor}`,
        boxShadow,
        animation:
          isDragging && !rejectedType ? "glow-pulse 1s ease infinite" : "none",
        transform: scaleTransform,
        touchAction: "manipulation",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-lg)",
          background: isDragging ? "rgba(0,255,136,0.15)" : "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          marginBottom: 14,
          transition: "all 0.2s",
          border: "1px solid var(--border)",
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: 6,
        }}
      >
        {ctaText}
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        {extList} · max {maxSizeMb} MB{multiple ? " · multiple files" : ""}
      </p>
      {/* Keyboard shortcut hint — only shown in idle state on non-touch devices */}
      {!isDragging && !isTouch && (
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          or press{" "}
          <kbd
            style={{
              display: "inline-block",
              padding: "1px 5px",
              borderRadius: 3,
              border: "1px solid var(--border-2)",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              background: "var(--surface-2)",
            }}
          >
            Space
          </kbd>{" "}
          to browse
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
