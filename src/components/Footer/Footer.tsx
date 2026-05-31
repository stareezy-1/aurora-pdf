import { Link } from "react-router";
import { config } from "@/lib/config";

const YEAR = new Date().getFullYear();

const PAGES_COL = {
  title: "Pages",
  links: [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "FAQ", path: "/faq" },
    { label: "Terms & Conditions", path: "/terms" },
  ],
};

const TOOL_COLS = [
  {
    title: "Convert to PDF",
    links: [
      { label: "Word to PDF", path: "/word-to-pdf" },
      { label: "Excel to PDF", path: "/excel-to-pdf" },
      { label: "HTML to PDF", path: "/html-to-pdf" },
      { label: "Image to PDF", path: "/image-to-pdf" },
      { label: "Text to PDF", path: "/text-to-pdf" },
      { label: "Markdown to PDF", path: "/markdown-to-pdf" },
      { label: "PowerPoint to PDF", path: "/pptx-to-pdf" },
      { label: "OCR: Images to PDF", path: "/ocr" },
    ],
  },
  {
    title: "Convert from PDF",
    links: [
      { label: "PDF to Word", path: "/pdf-to-word" },
      { label: "PDF to Excel", path: "/pdf-to-excel" },
      { label: "PDF to JPG", path: "/pdf-to-jpg" },
      { label: "PDF to PNG", path: "/pdf-to-png" },
      { label: "PDF to Text", path: "/pdf-to-text" },
      { label: "PDF to PowerPoint", path: "/pdf-to-ppt" },
      { label: "PDF to Greyscale", path: "/pdf-to-greyscale" },
      { label: "Extract Images", path: "/extract-images" },
    ],
  },
  {
    title: "Edit & Annotate",
    links: [
      { label: "Edit PDF", path: "/edit" },
      { label: "Sign PDF", path: "/sign" },
      { label: "Add Watermark", path: "/watermark" },
      { label: "Crop PDF", path: "/crop" },
      { label: "Header & Footer", path: "/header-footer" },
      { label: "Page Numbering", path: "/page-numbers" },
      { label: "Edit Bookmarks", path: "/bookmarks" },
      { label: "Metadata Editor", path: "/metadata" },
    ],
  },
  {
    title: "Organize",
    links: [
      { label: "Merge PDF", path: "/merge" },
      { label: "Split PDF", path: "/split" },
      { label: "Organize PDF", path: "/organize" },
      { label: "Rotate PDF", path: "/rotate" },
      { label: "Extract Pages", path: "/extract-pages" },
      { label: "Reverse Pages", path: "/reverse-pages" },
      { label: "PDF Multi Tool", path: "/multi-tool" },
      { label: "PDFs to ZIP", path: "/pdfs-to-zip" },
    ],
  },
  {
    title: "Optimize & Secure",
    links: [
      { label: "Compress PDF", path: "/compress" },
      { label: "Protect PDF", path: "/protect" },
      { label: "Repair PDF", path: "/repair" },
      { label: "Flatten PDF", path: "/flatten" },
      { label: "Sanitize PDF", path: "/sanitize" },
      { label: "Remove Metadata", path: "/remove-metadata" },
      { label: "Digital Signature", path: "/digital-sign" },
      { label: "PDF to PDF/A", path: "/pdf-to-pdfa" },
    ],
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
      {/* Main grid: brand + pages + 5 tool columns */}
      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 32px" }}
      >
        {/* Top row: brand + pages */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 40,
            marginBottom: 40,
            paddingBottom: 40,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Brand */}
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
                maxWidth: 340,
                marginBottom: 16,
              }}
            >
              A free, privacy-first PDF utility suite with 50+ tools. All
              processing happens locally in your browser — your files never
              leave your device.
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
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 16 }}>🛡</span>
              <span
                style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}
              >
                Zero uploads · 100% local processing
              </span>
            </div>
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
          </div>

          {/* Pages */}
          <div>
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
              {PAGES_COL.title}
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {PAGES_COL.links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    to={path}
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
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tool columns grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 32,
          }}
        >
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
                  gap: 7,
                }}
              >
                {col.links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      to={path}
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
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: "16px 24px",
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            flexWrap: "wrap",
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
          <a
            href="https://github.com/stareezy-1/aurora-pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: "var(--text-2)",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: 13,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
            aria-label="View AuroraPDF on GitHub"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
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
            stareezy-ui<span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["🛡 Privacy", "⚡ Fast", "🔒 Secure", "🆓 Free"].map((tag) => (
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
    </footer>
  );
}
