import { useState } from "react";
import { ToolLayout } from "@/components/ToolLayout/ToolLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { FaqEntry } from "@/types/site.types";

// All 8 required FAQ entries per Requirement 75.2
const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "Are my files uploaded to a server?",
    answer:
      "No. Every operation in AuroraPDF runs 100% in your browser using WebAssembly and modern browser APIs. Your files never leave your device and are never sent to any server.",
  },
  {
    question: "Is AuroraPDF free to use?",
    answer:
      "Yes, AuroraPDF is completely free. There are no subscriptions, no paywalls, and no hidden fees. All tools are available to everyone at no cost.",
  },
  {
    question: "Can I use AuroraPDF offline?",
    answer:
      "Yes. AuroraPDF is a Progressive Web App (PWA). After your first visit, the app and all its tools are cached locally and work without an internet connection. You can install it to your home screen for quick access.",
  },
  {
    question: "What PDF tools does AuroraPDF offer?",
    answer:
      "AuroraPDF offers a comprehensive suite of PDF tools including: Compress PDF, Edit PDF, Sign PDF, Add Watermark, Organize PDF, Split PDF, Protect PDF, OCR to PDF, Searchable PDF OCR, PDF to JPG, PDF to Word, Word to PDF, PDF to Excel, Excel to PDF, HTML to PDF, and many more. All tools run entirely in your browser.",
  },
  {
    question: "Does AuroraPDF work on mobile?",
    answer:
      "Yes. AuroraPDF is fully responsive and works on smartphones and tablets. You can also install it as a PWA on your mobile device for an app-like experience. Touch events are fully supported for tools that require interaction with PDF pages.",
  },
  {
    question: "How does the Searchable PDF OCR tool work?",
    answer:
      "The Searchable PDF OCR tool uses Tesseract.js — an open-source OCR engine compiled to WebAssembly — to analyse image-based PDF pages entirely in your browser. It detects text in scanned images and embeds an invisible text layer into the PDF, making the content searchable and selectable without uploading your file anywhere.",
  },
  {
    question: "Who built AuroraPDF?",
    answer:
      "AuroraPDF was built by Muhammad Bintang Al Akbar (Stareezy), a Front End Engineer. It was created out of frustration with PDF tools that upload your files to remote servers. You can learn more on the About page or visit the portfolio at stareezy.tech.",
  },
  {
    question: "Is AuroraPDF open source?",
    answer:
      "Yes. AuroraPDF is open-source software. The full source code is available on GitHub at github.com/stareezy-1/aurora-pdf. Contributions, bug reports, and feature requests are welcome.",
  },
];

function FaqItem({ entry, index }: { entry: FaqEntry; index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${index}`;
  const triggerId = `faq-trigger-${index}`;

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--text)",
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        <span>{entry.question}</span>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            fontSize: 18,
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(45deg)" : "none",
            display: "inline-block",
          }}
        >
          +
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: "var(--text-2)",
            lineHeight: 1.7,
            paddingBottom: 18,
            margin: 0,
          }}
        >
          {entry.answer}
        </p>
      </div>
    </div>
  );
}

export default function FaqPage() {
  usePageTitle("FAQ — AuroraPDF");

  return (
    <ToolLayout toolName="FAQ">
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
            Frequently Asked Questions
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-muted)",
              marginBottom: 40,
            }}
          >
            Everything you need to know about AuroraPDF.
          </p>

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "0 clamp(20px, 4vw, 32px)",
            }}
          >
            {FAQ_ENTRIES.map((entry, i) => (
              <FaqItem key={entry.question} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </main>
    </ToolLayout>
  );
}
