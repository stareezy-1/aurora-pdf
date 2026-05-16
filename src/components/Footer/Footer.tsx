import { config } from "@/lib/config";

const YEAR = new Date().getFullYear();

const TOOL_COLS = [
  {
    title: "Convert",
    links: [
      { label: "PDF to Word", path: "/pdf-to-word" },
      { label: "PDF to Excel", path: "/pdf-to-excel" },
      { label: "PDF to JPG", path: "/pdf-to-jpg" },
      { label: "Word to PDF", path: "/word-to-pdf" },
      { label: "Excel to PDF", path: "/excel-to-pdf" },
      { label: "HTML to PDF", path: "/html-to-pdf" },
    ],
  },
  {
    title: "Edit & Secure",
    links: [
      { label: "Compress PDF", path: "/compress" },
      { label: "Edit PDF", path: "/edit" },
      { label: "Sign PDF", path: "/sign" },
      { label: "Add Watermark", path: "/watermark" },
      { label: "Split PDF", path: "/split" },
      { label: "Organize PDF", path: "/organize" },
      { label: "Protect PDF", path: "/protect" },
    ],
  },
  {
    title: "Extract",
    links: [{ label: "OCR to PDF", path: "/ocr" }],
  },
];

export function Footer() {
  return (
    <footer
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        marginTop: "auto",
      }}
    >
      {/* Main footer body */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "48px 24px 32px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 40,
        }}
      >
        {/* Brand column */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                background:
                  "linear-gradient(135deg, var(--green), var(--purple))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Aurora
            </span>
            <span
              style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}
            >
              PDF
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-2)",
              lineHeight: 1.7,
              maxWidth: 280,
              marginBottom: 20,
            }}
          >
            A free, privacy-first PDF utility suite. All processing happens
            locally in your browser — your files never leave your device.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              background: "rgba(0,255,136,0.08)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: "var(--radius-md)",
              width: "fit-content",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 16 }}>🛡</span>
            <span
              style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}
            >
              Zero uploads · 100% local processing
            </span>
          </div>
          {/* Portfolio link */}
          <a
            href={config.portfolioAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--purple), #9333ea)",
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 6px 20px rgba(124,58,237,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "none";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 14px rgba(124,58,237,0.35)";
            }}
          >
            <span style={{ fontSize: 16 }}>🌐</span>
            Visit Stareezy
            <span style={{ fontSize: 12, opacity: 0.8 }}>↗</span>
          </a>
          {/* stareezy-ui badge */}
          {/* <a
            href={config.uiAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--purple)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 600,
              marginTop: 4,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(124,58,237,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(124,58,237,0.1)";
            }}
          >
            <span>⚡</span>
            Built with stareezy-ui
            <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
          </a> */}
        </div>

        {/* Tool columns */}
        {TOOL_COLS.map((col) => (
          <div key={col.title}>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 14,
              }}
            >
              {col.title}
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {col.links.map(({ label, path }) => (
                <li key={path}>
                  <a
                    href={path}
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--green)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-2)";
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          <span>Made with</span>
          <span style={{ color: "var(--red)", fontSize: 15 }}>♥</span>
          <span>by</span>
          <a
            href={config.portfolioAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--green)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Stareezy
          </a>
          <span>© {YEAR}</span>
          <span style={{ color: "var(--border-2)", margin: "0 4px" }}>·</span>
          <span>UI by</span>
          <a
            href={config.uiAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--purple)",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            stareezy-ui
            <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            AuroraPDF — Zero-Server PDF Tools
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {["🛡 Privacy", "⚡ Fast", "🔒 Secure"].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
