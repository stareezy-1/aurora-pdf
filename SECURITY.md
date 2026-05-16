# Security Audit — AuroraPDF Processing Libraries

All file processing in AuroraPDF is performed exclusively in the browser's memory. No file data is transmitted to any external server.

## Library Audit Table

| Library        | Pinned Version | Verified Network Behavior                                                                                             |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| pdf-lib        | 1.17.1         | No network requests. Operates entirely on in-memory Uint8Array buffers.                                               |
| pdfjs-dist     | 4.4.168        | Worker script loaded from local bundle only. No external fetches during PDF parsing or rendering.                     |
| tesseract.js   | 5.1.1          | Language model files loaded from local bundle or user-specified local path. No outbound requests with user file data. |
| xlsx (SheetJS) | 0.18.5         | No network requests. Reads/writes spreadsheet formats entirely in memory.                                             |
| mammoth        | 1.8.0          | No network requests. Converts .docx to HTML entirely in memory.                                                       |
| docx           | 8.5.0          | No network requests. Generates .docx files entirely in memory.                                                        |
| jszip          | 3.10.1         | No network requests. Creates ZIP archives entirely in memory.                                                         |

## Verification

Network behavior can be verified by opening browser DevTools → Network tab and processing a file through any tool. Zero outbound fetch or XHR requests to external URLs should appear during file processing.
