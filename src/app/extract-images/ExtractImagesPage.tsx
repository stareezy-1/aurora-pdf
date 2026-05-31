import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useExtractImages } from "./hooks/useExtractImages";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExtractImagesPage() {
  usePageTitle("Extract Images");
  const vm = useExtractImages();

  return (
    <ToolLayout toolName="Extract Images">
      <style>{`
        .image-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }
        .image-card {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .image-card img {
          width: 100%;
          height: 100px;
          object-fit: contain;
          background: var(--surface-3);
          padding: 4px;
        }
        .image-card-info {
          padding: 6px 8px;
          font-size: 11px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .image-card-name {
          font-size: 11px;
          color: var(--text-2);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <div className="tool-header">
        <h1>🖼️ Extract Images</h1>
        <p>
          Extract all embedded images from a PDF and download them as a ZIP
          archive.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to extract images"
          tool="extract-images"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">{vm.pageCount} pages</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
            >
              Change file
            </button>
          </div>

          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
            All embedded image XObjects will be extracted. Supported formats:
            JPEG, PNG.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending}
              aria-label="Extract images"
            >
              🖼️ Extract Images
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Change file
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

      {vm.status === "success" && vm.extractedPreviews.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
            Found <strong>{vm.extractedPreviews.length}</strong> image
            {vm.extractedPreviews.length !== 1 ? "s" : ""}
          </p>
          <div className="image-gallery">
            {vm.extractedPreviews.map((img) => (
              <div key={img.filename} className="image-card">
                <img src={img.dataUrl} alt={img.filename} />
                <div className="image-card-info">
                  <span className="image-card-name">{img.filename}</span>
                  <span>
                    {img.format} · {formatBytes(img.sizeBytes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={() => useAuroraStore.getState().clearWorkbox()}
          onReset={vm.handleReset}
          tool="extract-images"
        />
      )}
    </ToolLayout>
  );
}
