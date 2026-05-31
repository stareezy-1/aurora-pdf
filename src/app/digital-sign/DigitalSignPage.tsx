import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { ProgressPanel } from "@/components/ProgressPanel/ProgressPanel";
import { PrivacyShield } from "@/components/PrivacyShield/PrivacyShield";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useDigitalSign } from "./hooks/useDigitalSign";

export default function DigitalSignPage() {
  usePageTitle("Digital Signature");
  const vm = useDigitalSign();

  return (
    <ToolLayout toolName="Digital Signature">
      <div className="tool-header">
        <h1>🔏 Digital Signature</h1>
        <p>
          Embed a cryptographic digital signature using a PKCS#12 certificate
          (.p12 / .pfx). All processing happens locally — your file never leaves
          your device.
        </p>
      </div>

      {!vm.file && vm.status === "idle" && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to sign digitally"
          tool="digital-sign"
        />
      )}

      {vm.file && vm.status === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* File info */}
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
            <div>
              <div className="file-name">{vm.file.name}</div>
              <div className="file-size">
                {(vm.file.size / 1024).toFixed(1)} KB
                {vm.pageCount > 0 ? ` · ${vm.pageCount} pages` : ""}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={vm.handleReset}
              style={{ marginLeft: "auto" }}
            >
              Change file
            </button>
          </div>

          {/* Certificate upload */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="label">PKCS#12 Certificate (.p12 / .pfx)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                ref={vm.certInputRef}
                type="file"
                accept=".p12,.pfx"
                onChange={vm.handleCertFileChange}
                style={{ display: "none" }}
                id="cert-file-input"
                aria-label="Upload PKCS#12 certificate"
              />
              <button
                className="btn btn-secondary"
                onClick={() => vm.certInputRef.current?.click()}
                aria-label="Choose certificate file"
              >
                📂 Choose Certificate
              </button>
              {vm.certFile && (
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--green)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  ✓ {vm.certFile.name}
                </span>
              )}
            </div>
            {!vm.certFile && (
              <p
                style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}
              >
                Upload a .p12 or .pfx certificate file to sign the document.
              </p>
            )}
          </div>

          {/* Certificate password */}
          {vm.certFile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="cert-password">
                Certificate Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="cert-password"
                  className="input-field"
                  type={vm.showCertPassword ? "text" : "password"}
                  value={vm.certPassword}
                  onChange={(e) => vm.setCertPassword(e.target.value)}
                  placeholder="Enter certificate password…"
                  autoComplete="current-password"
                  style={{
                    paddingRight: 44,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => vm.setShowCertPassword((v) => !v)}
                  aria-label={
                    vm.showCertPassword ? "Hide password" : "Show password"
                  }
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    fontSize: 16,
                    padding: 0,
                  }}
                >
                  {vm.showCertPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          )}

          {/* Signature metadata */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="sig-reason">
                Reason{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="sig-reason"
                className="input-field"
                type="text"
                value={vm.reason}
                onChange={(e) => vm.setReason(e.target.value)}
                placeholder="e.g. Approved, Reviewed…"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="sig-location">
                Location{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <input
                id="sig-location"
                className="input-field"
                type="text"
                value={vm.location}
                onChange={(e) => vm.setLocation(e.target.value)}
                placeholder="e.g. Jakarta, Indonesia…"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Appearance config */}
          <div
            style={{
              padding: "12px 16px",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                color: "var(--text)",
              }}
            >
              Signature Appearance
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
                  className="label"
                  htmlFor="sig-page"
                  style={{ fontSize: 12 }}
                >
                  Page (1-based)
                </label>
                <input
                  id="sig-page"
                  className="input-field"
                  type="number"
                  min={1}
                  max={vm.pageCount || 1}
                  value={vm.appearance.pageIndex + 1}
                  onChange={(e) =>
                    vm.setAppearance((prev) => ({
                      ...prev,
                      pageIndex: Math.max(0, parseInt(e.target.value) - 1),
                    }))
                  }
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              {(
                [
                  { key: "x", label: "X (pt from left)" },
                  { key: "y", label: "Y (pt from bottom)" },
                  { key: "width", label: "Width (pt)" },
                  { key: "height", label: "Height (pt)" },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    className="label"
                    htmlFor={`sig-${key}`}
                    style={{ fontSize: 12 }}
                  >
                    {label}
                  </label>
                  <input
                    id={`sig-${key}`}
                    className="input-field"
                    type="number"
                    min={0}
                    value={vm.appearance[key]}
                    onChange={(e) =>
                      vm.setAppearance((prev) => ({
                        ...prev,
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            ℹ️ The signature field will be embedded with a placeholder
            cryptographic hash. Recipients may see "Signature validity unknown"
            in Acrobat — this is expected without a full PKCS#7 implementation.
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.handleApply}
              disabled={!vm.canSign}
              aria-label="Apply digital signature"
              aria-busy={vm.processor.isPending}
            >
              🔏 Apply Signature
            </button>
            <button className="btn btn-secondary" onClick={vm.handleReset}>
              Reset
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
          onDownload={vm.clearWorkbox}
          onReset={vm.handleReset}
          tool="digital-sign"
        />
      )}
    </ToolLayout>
  );
}
