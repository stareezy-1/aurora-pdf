import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useImageToPdf } from "./hooks/useImageToPdf";
import type {
  ImagePageSize,
  ImageOrientation,
} from "@/engines/conversion-engine";

const PAGE_SIZES: { value: ImagePageSize; label: string }[] = [
  { value: "A4", label: "A4" },
  { value: "Letter", label: "Letter" },
  { value: "Legal", label: "Legal" },
  { value: "fit", label: "Fit to image" },
];

export default function ImageToPdfPage() {
  usePageTitle("Image to PDF");
  const vm = useImageToPdf();

  return (
    <ToolLayout toolName="Image to PDF">
      <style>{`
        .img-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .img-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .img-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
          background: var(--surface-3);
          flex-shrink: 0;
        }
        .img-row-name {
          flex: 1;
          font-size: 13px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .img-row-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
      `}</style>

      <div className="tool-header">
        <h1>🖼️ Image to PDF</h1>
        <p>
          Combine multiple images into a single PDF. Reorder them before
          converting.
        </p>
      </div>

      {vm.status === "idle" && (
        <FileDropZone
          accept={vm.IMAGE_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop images to add to PDF"
          tool="image-to-pdf"
          multiple
        />
      )}

      {vm.images.length > 0 && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Image list */}
          <div>
            <p
              style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}
            >
              {vm.images.length} image{vm.images.length !== 1 ? "s" : ""} — use
              ↑↓ to reorder
            </p>
            <div className="img-list">
              {vm.images.map((img, idx) => (
                <div key={img.id} className="img-row">
                  <img
                    src={img.dataUrl}
                    alt={img.file.name}
                    className="img-thumb"
                  />
                  <span className="img-row-name">{img.file.name}</span>
                  <div className="img-row-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.moveImage(idx, idx - 1)}
                      disabled={idx === 0}
                      aria-label={`Move ${img.file.name} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.moveImage(idx, idx + 1)}
                      disabled={idx === vm.images.length - 1}
                      aria-label={`Move ${img.file.name} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => vm.removeImage(img.id)}
                      aria-label={`Remove ${img.file.name}`}
                      title="Remove"
                      style={{ color: "var(--red, #ef4444)" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Page size + orientation */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              maxWidth: 480,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label">Page Size</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PAGE_SIZES.map((s) => (
                  <button
                    key={s.value}
                    className={`btn btn-sm ${
                      vm.pageSize === s.value ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => vm.setPageSize(s.value)}
                    aria-pressed={vm.pageSize === s.value}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {vm.pageSize !== "fit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="label">Orientation</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["portrait", "landscape"] as ImageOrientation[]).map(
                    (o) => (
                      <button
                        key={o}
                        className={`btn btn-sm ${
                          vm.orientation === o ? "btn-primary" : "btn-secondary"
                        }`}
                        onClick={() => vm.setOrientation(o)}
                        aria-pressed={vm.orientation === o}
                      >
                        {o === "portrait" ? "⬜ Portrait" : "⬛ Landscape"}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Convert images to PDF"
            >
              🖼️ Convert to PDF
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Clear all
            </button>
          </div>
        </div>
      )}

      <ProgressPanel
        status={vm.status}
        progress={vm.progress}
        label={vm.progressLabel}
        errorMessage={vm.errorMessage ?? undefined}
        onRetry={vm.handleReset}
      />

      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={() => useAuroraStore.getState().clearWorkbox()}
          onReset={vm.handleReset}
          tool="image-to-pdf"
        />
      )}
    </ToolLayout>
  );
}
