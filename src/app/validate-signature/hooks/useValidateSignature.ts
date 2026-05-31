/**
 * useValidateSignature — hook for the Validate Signature tool.
 * List all sig fields with signer/date/reason/location, integrity status.
 *
 * Requirements: 71.1, 71.2, 71.3, 71.4
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { validateSignatures } from "@/engines/security-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import type { SignatureValidationResult } from "@/engines/security-engine";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

export function useValidateSignature() {
  const { failSession } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT });
  const [results, setResults] = useState<SignatureValidationResult[] | null>(
    null,
  );
  const [isValidating, setIsValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const handleValidate = useCallback(async () => {
    if (!session.bytes) return;
    setIsValidating(true);
    setValidateError(null);
    setResults(null);
    try {
      const sigs = await validateSignatures(session.bytes);
      setResults(sigs);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to validate signatures.";
      setValidateError(msg);
      failSession(msg);
    } finally {
      setIsValidating(false);
    }
  }, [session.bytes, failSession]);

  const handleReset = useCallback(() => {
    session.reset();
    setResults(null);
    setValidateError(null);
  }, [session]);

  return {
    file: session.file,
    bytes: session.bytes,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    results,
    isValidating,
    validateError,
    handleValidate,
    handleReset,
    PDF_ACCEPT,
  };
}
