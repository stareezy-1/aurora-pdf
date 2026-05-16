export interface AcceptedFileType {
  mime: string;
  extension: string; // e.g. '.pdf', '.docx'
}

export interface ValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

const DEFAULT_MAX_SIZE_MB = 100;

/**
 * Validates a File against accepted MIME types, extensions, and size limit.
 * Files at exactly the limit are accepted (<=, not <).
 */
export function validateFile(
  file: File,
  accepted: AcceptedFileType[],
  maxSizeMb: number = DEFAULT_MAX_SIZE_MB,
): ValidationResult {
  // Size check first — fast path
  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      errorMessage: `File exceeds the ${maxSizeMb} MB size limit (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
    };
  }

  // Derive extension from filename (lowercase, includes the dot)
  const dotIndex = file.name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";

  const mimeMatch = accepted.some((a) => a.mime === file.type);
  const extMatch = accepted.some((a) => a.extension.toLowerCase() === ext);

  if (!mimeMatch && !extMatch) {
    const acceptedList = accepted
      .map((a) => `${a.extension} (${a.mime})`)
      .join(", ");
    return {
      valid: false,
      errorMessage: `Unsupported file type "${ext || file.type}". Accepted formats: ${acceptedList}.`,
    };
  }

  return { valid: true, errorMessage: null };
}
