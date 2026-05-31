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

export class CoordinateMapperNotReadyError extends Error {
  readonly code = "COORDINATE_MAPPER_NOT_READY" as const;
  constructor(
    message = "CoordinateMapper: page preview image is not yet loaded. Cannot compute PDF coordinates.",
  ) {
    super(message);
    this.name = "CoordinateMapperNotReadyError";
  }
}

export class PhotonWarningRequiredError extends Error {
  readonly code = "PHOTON_WARNING_REQUIRED" as const;
  constructor(
    message = "The Photon algorithm makes text non-selectable and links non-functional. Please acknowledge the warning before proceeding.",
  ) {
    super(message);
    this.name = "PhotonWarningRequiredError";
  }
}

export class BatchFileLimitError extends Error {
  readonly code = "BATCH_FILE_LIMIT" as const;
  constructor(
    limit = 10,
    message = `Batch processing supports a maximum of ${limit} files per session.`,
  ) {
    super(message);
    this.name = "BatchFileLimitError";
  }
}

export class FileTooLargeError extends Error {
  readonly code = "FILE_TOO_LARGE" as const;
  constructor(
    fileSizeMb: number,
    maxSizeMb: number,
    message = `File is ${fileSizeMb.toFixed(
      1,
    )} MB — max allowed is ${maxSizeMb} MB.`,
  ) {
    super(message);
    this.name = "FileTooLargeError";
  }
}

export class InvalidPageRangeError extends Error {
  readonly code = "INVALID_PAGE_RANGE" as const;
  constructor(
    range: string,
    message = `Invalid page range expression: "${range}". Use formats like "1-3,5,7-9".`,
  ) {
    super(message);
    this.name = "InvalidPageRangeError";
  }
}

export class PageRangeOutOfBoundsError extends Error {
  readonly code = "PAGE_RANGE_OUT_OF_BOUNDS" as const;
  constructor(
    page: number,
    total: number,
    message = `Page ${page} is out of bounds — document has ${total} page(s).`,
  ) {
    super(message);
    this.name = "PageRangeOutOfBoundsError";
  }
}

export class InvalidCertificateError extends Error {
  readonly code = "INVALID_CERTIFICATE" as const;
  constructor(
    message = "The provided certificate file is invalid or the password is incorrect.",
  ) {
    super(message);
    this.name = "InvalidCertificateError";
  }
}

export class CropMarginsError extends Error {
  readonly code = "CROP_MARGINS_ERROR" as const;
  constructor(
    message = "Crop margins must be greater than zero and must not exceed the page dimensions.",
  ) {
    super(message);
    this.name = "CropMarginsError";
  }
}
