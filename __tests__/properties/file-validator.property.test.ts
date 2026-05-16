import { describe, it } from "vitest";
import * as fc from "fast-check";
import { validateFile } from "../../src/lib/file-validator";
import type { AcceptedFileType } from "../../src/lib/file-validator";

const PDF_ACCEPT: AcceptedFileType[] = [
  { mime: "application/pdf", extension: ".pdf" },
];

function makeFile(name: string, mime: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type: mime });
  return new File([blob], name, { type: mime });
}

describe("Property 6: file validator accepts/rejects by MIME type and extension", () => {
  it("accepts files with matching MIME type", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-z0-9]+$/.test(s)),
        (base) => {
          const file = makeFile(`${base}.pdf`, "application/pdf", 100);
          const result = validateFile(file, PDF_ACCEPT);
          return result.valid === true && result.errorMessage === null;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects files with non-matching MIME type and extension", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-z0-9]+$/.test(s)),
        (base) => {
          const file = makeFile(`${base}.txt`, "text/plain", 100);
          const result = validateFile(file, PDF_ACCEPT);
          return result.valid === false && result.errorMessage !== null;
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 7: file validator rejects files exceeding size limit", () => {
  it("rejects files strictly over the limit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 1024 * 1024 }),
        (limitMb, extraBytes) => {
          const limitBytes = limitMb * 1024 * 1024;
          const file = makeFile(
            "test.pdf",
            "application/pdf",
            limitBytes + extraBytes,
          );
          const result = validateFile(file, PDF_ACCEPT, limitMb);
          return result.valid === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("accepts files at exactly the limit", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (limitMb) => {
        const limitBytes = limitMb * 1024 * 1024;
        const file = makeFile("test.pdf", "application/pdf", limitBytes);
        const result = validateFile(file, PDF_ACCEPT, limitMb);
        return result.valid === true;
      }),
      { numRuns: 100 },
    );
  });
});
