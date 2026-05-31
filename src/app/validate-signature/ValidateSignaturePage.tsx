import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { FileDropZone } from "@/components/FileDropZone/FileDropZone";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuroraStore } from "@/stores/aurora.store";
import { useValidateSignature } from "./hooks/useValidateSignature";
import type { SignatureValidationResult } from "@/engines/security-engine";

const STATUS_CONFIG: Record<
  SignatureValidationResult["status"],
  { label: string; color: string; bg: string; icon: string }
> = {
  valid: {
    label: "Valid",
    color: "rgba(0,255,136,1)",
    bg: "rgba(0,255,136,0.08)",
    icon: "✅",
  },
  invalid: {
    label: "Invalid",
    color: "rgba(239,68,68,1)",
    bg: "rgba(239,68,68,0.08)",
    icon: "❌",
  },
  unknown: {
    label: "Unknown",
    color: "rgba(245,158,11,1)",
    bg: "rgba(245,158,11,0.08)",
    icon: "⚠️",
  },
};

export default function ValidateSignaturePage() {
  usePageTitle("Validate Signature");
  const vm = useValidateSignature();

  return (
    <ToolLayout toolName="Validate Signature">
      <div className="tool-header">
        <h1>🔍 Validate Signature</h1>
        <p>
          Inspect all digital signature fields in a PDF — view signer details,
          date, reason, location, and integrity status. All processing happens
          locally.
        </p>
      </div>

      {!vm.file && (
        <FileDropZone
          accept={vm.PDF_ACCEPT}
          onFilesAccepted={vm.handleFileDrop}
          onError={(msg) => useAuroraStore.getState().failSession(msg)}
          aria-label="Drop a PDF to validate signatures"
          tool="validate-signature"
        />
      )}

      {vm.file && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="file-info-strip">
            <span className="file-icon">📄</span>
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
              Change file
            </button>
          </div>

          {vm.results === null && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={vm.handleValidate}
                disabled={vm.isValidating || !vm.bytes}
                aria-label="Validate signatures"
                aria-busy={vm.isValidating}
              >
                {vm.isValidating ? "⏳ Validating…" : "🔍 Validate Signatures"}
              </button>
              <button className="btn btn-secondary" onClick={vm.handleReset}>
                Change file
              </button>
            </div>
          )}

          {vm.validateError && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                color: "var(--red, #ef4444)",
              }}
              role="alert"
            >
              ⚠ {vm.validateError}
            </div>
          )}

          {vm.results !== null && (
            <>
              {vm.results.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    fontSize: 14,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  ℹ️ No digital signature fields found in this PDF.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                  aria-label={`${vm.results.length} signature${
                    vm.results.length !== 1 ? "s" : ""
                  } found`}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Found {vm.results.length} signature field
                    {vm.results.length !== 1 ? "s" : ""}
                  </div>

                  {vm.results.map((sig, idx) => {
                    const cfg = STATUS_CONFIG[sig.status];
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "14px 16px",
                          background: cfg.bg,
                          border: `1px solid ${cfg.color}33`,
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                        role="article"
                        aria-label={`Signature ${sig.fieldName}`}
                      >
                        {/* Header row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              color: "var(--text)",
                            }}
                          >
                            {cfg.icon} {sig.fieldName}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: cfg.color,
                              padding: "2px 10px",
                              borderRadius: 999,
                              border: `1px solid ${cfg.color}55`,
                              background: cfg.bg,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        {/* Metadata grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: "6px 16px",
                          }}
                        >
                          {[
                            { label: "Signer", value: sig.signerName },
                            { label: "Date", value: sig.signDate },
                            { label: "Reason", value: sig.reason },
                            { label: "Location", value: sig.location },
                          ].map(({ label, value }) =>
                            value ? (
                              <div key={label}>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: 2,
                                  }}
                                >
                                  {label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "var(--text)",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {value}
                                </div>
                              </div>
                            ) : null,
                          )}
                        </div>

                        {/* Status message */}
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            margin: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {sig.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    // Re-validate
                    vm.handleValidate();
                  }}
                  aria-label="Re-validate signatures"
                >
                  🔄 Re-validate
                </button>
                <button className="btn btn-secondary" onClick={vm.handleReset}>
                  Change file
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
