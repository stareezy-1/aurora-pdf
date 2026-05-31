import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

interface TermsSection {
  title: string;
  content: string;
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "Service Description",
    content:
      "AuroraPDF is a free, browser-based PDF toolkit. All processing occurs entirely within your browser using WebAssembly and modern browser APIs. No files are transmitted to any server. The service is provided as-is, free of charge, with no registration required.",
  },
  {
    title: "Disclaimer",
    content:
      'AuroraPDF is provided "as is" without warranty of any kind, express or implied. We do not guarantee that the service will be uninterrupted, error-free, or that the output files will meet your specific requirements. You are solely responsible for verifying the accuracy and integrity of any processed files before use.',
  },
  {
    title: "Limitation of Liability",
    content:
      "To the fullest extent permitted by applicable law, the creators of AuroraPDF shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the service, including but not limited to loss of data, loss of profits, or business interruption.",
  },
  {
    title: "Intellectual Property & Open Source",
    content:
      "AuroraPDF is open-source software. The source code is available on GitHub under its respective license. Third-party libraries used by AuroraPDF (including pdf-lib, pdfjs-dist, and Tesseract.js) are subject to their own licenses. You retain full ownership of any files you process using AuroraPDF.",
  },
  {
    title: "Privacy",
    content:
      "AuroraPDF does not collect, store, or transmit your files or their contents. All PDF processing happens locally in your browser. We do not use cookies for tracking, do not collect personal data, and do not run analytics on your documents. Basic, anonymized usage analytics (page views) may be collected to improve the service.",
  },
  {
    title: "Contact",
    content:
      "For questions, bug reports, or feature requests, please open an issue on the GitHub repository at github.com/stareezy-1/aurora-pdf, or reach out via the portfolio site at stareezy.tech.",
  },
];

export default function TermsPage() {
  usePageTitle("Terms & Conditions — AuroraPDF");

  return (
    <ToolLayout toolName="Terms & Conditions">
      <main className="page-content">
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "clamp(32px, 5vw, 64px) 0",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 900,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            Terms &amp; Conditions
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 40,
            }}
          >
            Last updated: January 2025
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {TERMS_SECTIONS.map((section) => (
              <section
                key={section.title}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "clamp(20px, 4vw, 32px)",
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: 12,
                  }}
                >
                  {section.title}
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-2)",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>
    </ToolLayout>
  );
}
