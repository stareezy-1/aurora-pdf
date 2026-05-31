import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useMergePdf } from "./hooks/useMergePdf";

export default function MergePdfPage() {
  usePageTitle("Merge PDF");
  const vm = useMergePdf();

  return (
    <ToolLayout toolName="Merge PDF">
      <div className="tool-header">
        <h1>🔗 Merge PDF</h1>
        <p>
          Combine multiple PDF files into one. Drag to reorder before merging.
        </p>
      </div>

      <FileDropZone
        accept={vm.PDF_ACCEPT}
        multiple
        onFilesAccepted={vm.handleFileDrop}
        onError={(msg) => useAuroraStore.getState().failSession(msg)}
        aria-label="Drop PDF files to merge"
        tool="merge"
      />

      {vm.files.length > 0 && vm.status === "idle" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {vm.files.length} file{vm.files.length !== 1 ? "s" : ""} — drag to
              reorder
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Max {vm.MAX_FILES} files
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
            role="list"
            aria-label="Files to merge"
          >
            {vm.files.map((mf, idx) => (
              <div
                key={mf.id}
                role="listitem"
                draggable
                onDragStart={() => vm.setDragSrc(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  vm.setDragOver(idx);
                }}
                onDrop={() => {
                  if (vm.dragSrc !== null) vm.handleDrop(vm.dragSrc, idx);
                }}
                onDragEnd={() => {
                  vm.setDragSrc(null);
                  vm.setDragOver(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background:
                    vm.dragOver === idx
                      ? "rgba(0,255,136,0.08)"
                      : "var(--surface-2)",
                  border:
                    vm.dragOver === idx
                      ? "1.5px solid var(--green)"
                      : "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  cursor: "grab",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 16,
                    cursor: "grab",
                  }}
                >
                  ⠿
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    minWidth: 20,
                  }}
                >
                  {idx + 1}.
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  📄 {mf.file.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(mf.file.size / 1024).toFixed(0)} KB
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="password"
                    placeholder="Password (if protected)"
                    value={mf.password ?? ""}
                    onChange={(e) => vm.setPassword(mf.id, e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-3)",
                      color: "var(--text)",
                      width: 160,
                    }}
                    aria-label={`Password for ${mf.file.name}`}
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => vm.removeFile(mf.id)}
                    aria-label={`Remove ${mf.file.name}`}
                    style={{ color: "var(--red, #ff4444)", fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleMerge}
              disabled={vm.files.length < 2}
              aria-label="Merge PDFs"
            >
              🔗 Merge {vm.files.length} PDFs
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Clear all
            </button>
          </div>

          {vm.files.length < 2 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Add at least 2 files to merge.
            </p>
          )}
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
          tool="merge"
        />
      )}
    </ToolLayout>
  );
}
