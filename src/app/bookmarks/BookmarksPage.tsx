import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useBookmarks } from "./hooks/useBookmarks";
import type { BookmarkNode } from "@/engines/organization-engine";

interface BookmarkItemProps {
  node: BookmarkNode;
  path: number[];
  pageCount: number;
  depth: number;
  onUpdate: (
    path: number[],
    patch: Partial<Pick<BookmarkNode, "title" | "pageIndex">>,
  ) => void;
  onDelete: (path: number[]) => void;
  onAddChild: (path: number[]) => void;
  onMove: (path: number[], dir: "up" | "down") => void;
}

function BookmarkItem({
  node,
  path,
  pageCount,
  depth,
  onUpdate,
  onDelete,
  onAddChild,
  onMove,
}: BookmarkItemProps) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          marginBottom: 4,
        }}
      >
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {"  ".repeat(depth)}📌
        </span>
        <input
          type="text"
          value={node.title}
          onChange={(e) => onUpdate(path, { title: e.target.value })}
          style={{
            flex: 1,
            fontSize: 13,
            background: "transparent",
            border: "none",
            color: "var(--text)",
            outline: "none",
          }}
          aria-label="Bookmark title"
        />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          p.
        </span>
        <input
          type="number"
          min={1}
          max={pageCount}
          value={node.pageIndex + 1}
          onChange={(e) =>
            onUpdate(path, {
              pageIndex: Math.max(0, parseInt(e.target.value, 10) - 1) || 0,
            })
          }
          style={{
            width: 52,
            fontSize: 12,
            textAlign: "center",
            background: "var(--surface-3)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text)",
            padding: "2px 4px",
          }}
          aria-label="Page number"
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onMove(path, "up")}
          title="Move up"
          style={{ padding: "2px 6px", fontSize: 11 }}
        >
          ↑
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onMove(path, "down")}
          title="Move down"
          style={{ padding: "2px 6px", fontSize: 11 }}
        >
          ↓
        </button>
        {depth < 2 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onAddChild(path)}
            title="Add child"
            style={{ padding: "2px 6px", fontSize: 11 }}
          >
            +
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onDelete(path)}
          title="Delete"
          style={{
            padding: "2px 6px",
            fontSize: 11,
            color: "var(--red, #ef4444)",
          }}
        >
          ✕
        </button>
      </div>
      {node.children?.map((child, i) => (
        <BookmarkItem
          key={i}
          node={child}
          path={[...path, i]}
          pageCount={pageCount}
          depth={depth + 1}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

export default function BookmarksPage() {
  usePageTitle("Edit Bookmarks");
  const vm = useBookmarks();

  return (
    <ToolLayout toolName="Edit Bookmarks">
      <div className="tool-header">
        <h1>🔖 Edit Bookmarks</h1>
        <p>
          Add, rename, reorder, and nest bookmarks (up to 3 levels) in your PDF.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to edit bookmarks"
          tool="bookmarks"
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

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}
            >
              Bookmarks ({vm.bookmarks.length})
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.addBookmark}
            >
              + Add Bookmark
            </button>
          </div>

          {vm.bookmarks.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--text-muted)",
                background: "var(--surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border)",
              }}
            >
              No bookmarks yet. Click "Add Bookmark" to start.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {vm.bookmarks.map((bm, i) => (
                <BookmarkItem
                  key={i}
                  node={bm}
                  path={[i]}
                  pageCount={vm.pageCount}
                  depth={0}
                  onUpdate={vm.updateBookmark}
                  onDelete={vm.deleteBookmark}
                  onAddChild={vm.addChild}
                  onMove={vm.moveBookmark}
                />
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.bookmarks.length === 0}
              aria-label="Save bookmarks to PDF"
            >
              🔖 Save Bookmarks
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

      {vm.status === "success" && (
        <PrivacyShield
          variant="card"
          status={vm.status}
          outputFilename={vm.outputFilename ?? undefined}
          blobUrl={vm.resultBlobUrl}
          onDownload={() => useAuroraStore.getState().clearWorkbox()}
          onReset={vm.handleReset}
          tool="bookmarks"
        />
      )}
    </ToolLayout>
  );
}
