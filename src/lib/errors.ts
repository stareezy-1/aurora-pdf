export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class EncryptedPdfError extends Error {
  readonly code = "ENCRYPTED_PDF" as const;
  constructor(
    message = "This PDF is password-protected and cannot be processed.",
  ) {
    super(message);
    this.name = "EncryptedPdfError";
  }
}

export class NoTextLayerError extends Error {
  readonly code = "NO_TEXT_LAYER" as const;
  constructor(
    message = "This PDF appears to be image-based and has no embedded text layer. Try the OCR tool first.",
  ) {
    super(message);
    this.name = "NoTextLayerError";
  }
}

export class ParseError extends Error {
  readonly code = "PARSE_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export class NoTablesError extends Error {
  readonly code = "NO_TABLES" as const;
  constructor(message = "No tabular data was detected in this PDF.") {
    super(message);
    this.name = "NoTablesError";
  }
}

export class EngineError extends Error {
  readonly code = "ENGINE_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export class SignatureImageTooLargeError extends Error {
  readonly code = "SIGNATURE_IMAGE_TOO_LARGE" as const;
  constructor(message = "Signature image exceeds the 5 MB size limit.") {
    super(message);
    this.name = "SignatureImageTooLargeError";
  }
}
