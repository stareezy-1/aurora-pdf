import JSZip from "jszip";

export interface ZipEntry {
  filename: string;
  data: Uint8Array;
}

/**
 * Packages an array of file entries into a single ZIP Blob using JSZip.
 * All operations are in-memory — no network or disk I/O.
 */
export async function packageFilesAsZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.filename, entry.data);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
