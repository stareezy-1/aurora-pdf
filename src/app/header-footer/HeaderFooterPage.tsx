import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import {
  useHeaderFooter,
  DYNAMIC_TOKENS,
  FONTS,
} from "./hooks/useHeaderFooter";
import type { HeaderFooterConfig } from "@/types/tool.types";

type ZoneKey = keyof Pick<
  HeaderFooterConfig,
  | "headerLeft"
  | "headerCenter"
  | "headerRight"
  | "footerLeft"
  | "footerCenter"
  | "footerRight"
>;

const ZONES: { key: ZoneKey; label: string }[] = [
  { key: "headerLeft", label: "Header Left" },
  { key: "headerCenter", label: "Header Center" },
  { key: "headerRight", label: "Header Right" },
  { key: "footerLeft", label: "Footer Left" },
  { key: "footerCenter", label: "Footer Center" },
  { key: "footerRight", label: "Footer Right" },
];

export default function HeaderFooterPage() {
  usePageTitle("Header & Footer");
  const vm = useHeaderFooter();

  return (
    <ToolLayout toolName="Header & Footer">
      <div className="tool-header">
        <h1>📋 Header &amp; Footer</h1>
        <p>Add custom text to the header and footer of each page.</p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to add header and footer"
          tool="header-footer"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              flex: "1 1 340px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
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

            {/* Dynamic token chips */}
            <div>
              <label className="label">Dynamic Tokens</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DYNAMIC_TOKENS.map(({ token, label }) => (
                  <span
                    key={token}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full, 999px)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-2)",
                      fontSize: 12,
                      color: "var(--green)",
                      fontFamily: "monospace",
                      cursor: "default",
                    }}
                    title={`Click a zone input and type ${token}`}
                  >
                    {token}{" "}
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "inherit",
                      }}
                    >
                      ({label})
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* 6-zone inputs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              {ZONES.map(({ key, label }) => (
                <div
                  key={key}
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label className="label" style={{ fontSize: 11 }}>
                    {label}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="input"
                      placeholder={
                        key.includes("footer") && key.includes("Center")
                          ? "{page}/{total}"
                          : ""
                      }
                      value={String(vm.config[key] ?? "")}
                      onChange={(e) => vm.update({ [key]: e.target.value })}
                      style={{ fontSize: 12, paddingRight: 28 }}
                      aria-label={label}
                    />
                    {/* Token insert dropdown */}
                    <select
                      style={{
                        position: "absolute",
                        right: 2,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 24,
                        height: 24,
                        opacity: 0,
                        cursor: "pointer",
                      }}
                      onChange={(e) => {
                        if (e.target.value) {
                          vm.insertToken(key, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      aria-label={`Insert token into ${label}`}
                    >
                      <option value="">+</option>
                      {DYNAMIC_TOKENS.map(({ token, label: tl }) => (
                        <option key={token} value={token}>
                          {tl}
                        </option>
                      ))}
                    </select>
                    <span
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    >
                      +
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Style controls */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 120px" }}>
                <label className="label">Font</label>
                <select
                  className="select"
                  value={vm.config.fontFamily}
                  onChange={(e) => vm.update({ fontFamily: e.target.value })}
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "0 0 80px" }}>
                <label className="label">Size</label>
                <input
                  type="number"
                  className="input"
                  min={6}
                  max={72}
                  value={vm.config.fontSize}
                  onChange={(e) =>
                    vm.update({ fontSize: parseInt(e.target.value, 10) || 10 })
                  }
                />
              </div>
              <div style={{ flex: "0 0 60px" }}>
                <label className="label">Color</label>
                <input
                  type="color"
                  value={vm.config.color}
                  onChange={(e) => vm.update({ color: e.target.value })}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                />
              </div>
              <div style={{ flex: "0 0 80px" }}>
                <label className="label">Margin (pt)</label>
                <input
                  type="number"
                  className="input"
                  min={5}
                  max={100}
                  value={vm.config.marginOffset}
                  onChange={(e) =>
                    vm.update({
                      marginOffset: parseInt(e.target.value, 10) || 20,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="label">Page Range (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 2-10 (leave blank for all)"
                value={vm.config.pageRange}
                onChange={(e) => vm.update({ pageRange: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleApply}
                aria-label="Apply header and footer"
              >
                📋 Apply Header &amp; Footer
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          </div>

          {vm.preview && (
            <div className="preview-panel" style={{ flex: "0 0 240px" }}>
              <div className="preview-panel-header">📄 Preview</div>
              <div
                className="preview-panel-body"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <img
                  src={vm.preview}
                  alt="PDF preview"
                  style={{ maxWidth: "100%", borderRadius: 4 }}
                />
              </div>
            </div>
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
          tool="header-footer"
        />
      )}
    </ToolLayout>
  );
}
