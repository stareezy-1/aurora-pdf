import { useRef, useState, useCallback } from "react";
import { validateFile } from "@/lib/file-validator";
import type { FileDropZoneProps } from "./FileDropZone.types";

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
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!disabled) setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) processFiles(e.dataTransfer.files);
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
        background: isDragging ? "rgba(0,255,136,0.06)" : "var(--surface)",
        border: isDragging
          ? "2px solid var(--green)"
          : "2px dashed var(--border-2)",
        boxShadow: isDragging ? "var(--glow-green)" : "none",
        animation: isDragging ? "glow-pulse 1s ease infinite" : "none",
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
        {isDragging ? "📂" : "📄"}
      </div>
      <p
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: 6,
        }}
      >
        {isDragging ? "Drop to upload" : "Drag & drop or click to select"}
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {extList} · max {maxSizeMb} MB{multiple ? " · multiple files" : ""}
      </p>
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
