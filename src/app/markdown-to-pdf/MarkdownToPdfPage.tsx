import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useMarkdownToPdf } from "./hooks/useMarkdownToPdf";
import type { MarkdownTheme } from "@/engines/conversion-engine";

const THEMES: { value: MarkdownTheme; label: string }[] = [
  { value: "light", label: "☀️ Light" },
  { value: "dark", label: "🌙 Dark" },
  { value: "github", label: "🐙 GitHub" },
];

export default function MarkdownToPdfPage() {
  usePageTitle("Markdown to PDF");
  const vm = useMarkdownToPdf();

  const showEditor = vm.status === "idle";

  return (
    <ToolLayout toolName="Markdown to PDF">
      <style>{`
        .md-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .md-layout { grid-template-columns: 1fr; }
        }
        .md-editor {
          width: 100%;
          min-height: 320px;
          padding: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text);
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
          resize: vertical;
          box-sizing: border-box;
        }
        .md-editor:focus { outline: none; border-color: var(--green); }
        .md-preview {
          min-height: 320px;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: #000;
          font-family: sans-serif;
          font-size: 14px;
          line-height: 1.6;
          overflow: auto;
        }
        .md-preview.dark {
          background: #1e1e1e;
          color: #d4d4d4;
        }
        .md-preview.github {
          background: #fff;
          color: #24292e;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .md-preview h1, .md-preview h2, .md-preview h3 { margin: 0.5em 0; }
        .md-preview p { margin: 0.4em 0; }
        .md-preview code { background: rgba(0,0,0,0.08); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
        .md-preview pre { background: rgba(0,0,0,0.06); padding: 10px; border-radius: 4px; overflow: auto; }
        .md-preview blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #666; }
        .md-preview ul { padding-left: 20px; }
      `}</style>

      <div className="tool-header">
        <h1>📋 Markdown to PDF</h1>
        <p>
          Convert Markdown to a styled PDF. Drop a .md file or type directly in
          the editor.
        </p>
      </div>

      {!vm.file && !vm.markdownText && vm.status === "idle" && (
        <FileDropZone
          accept={vm.MD_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a Markdown file to convert"
          tool="markdown-to-pdf"
        />
      )}

      {showEditor && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {vm.file && (
            <div className="file-info-strip">
              <span className="file-icon">📋</span>
              <div>
                <div className="file-name">{vm.file.name}</div>
                <div className="file-size">
                  {(vm.file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={vm.handleReset}
                style={{ marginLeft: "auto" }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Theme selector */}
          <div>
            <label className="label">Theme</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  className={`btn btn-sm ${
                    vm.theme === t.value ? "btn-primary" : "btn-secondary"
                  }`}
                  onClick={() => vm.setTheme(t.value)}
                  aria-pressed={vm.theme === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editor + preview */}
          <div className="md-layout">
            <div>
              <label
                className="label"
                style={{ marginBottom: 6, display: "block" }}
              >
                Markdown Editor
              </label>
              <textarea
                className="md-editor"
                value={vm.markdownText}
                onChange={(e) => vm.setMarkdownText(e.target.value)}
                placeholder="# Hello World&#10;&#10;Type your Markdown here…"
                aria-label="Markdown editor"
              />
            </div>
            <div>
              <label
                className="label"
                style={{ marginBottom: 6, display: "block" }}
              >
                Preview
              </label>
              <div
                className={`md-preview ${vm.theme}`}
                // Safe: we control the HTML generation from our own markdown parser
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: vm.markdownText
                    ? vm.markdownText
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
                        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
                        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
                        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
                        .replace(/`([^`]+)`/g, "<code>$1</code>")
                        .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
                        .replace(/\n\n/g, "<br/><br/>")
                    : "<p style='color:#999'>Preview will appear here…</p>",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={vm.isPending || !vm.markdownText.trim()}
              aria-label="Convert to PDF"
            >
              📋 Convert to PDF
            </button>
            {(vm.file || vm.markdownText) && (
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Clear
              </button>
            )}
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
          tool="markdown-to-pdf"
        />
      )}
    </ToolLayout>
  );
}
