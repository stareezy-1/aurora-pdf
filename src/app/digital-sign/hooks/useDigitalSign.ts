/**
 * useDigitalSign — hook for the Digital Signature tool.
 * PKCS#12 upload + password, appearance config via CoordinateMapper, Worker signing.
 *
 * Requirements: 70.1, 70.2, 70.3, 70.4, 70.5
 */

import { useState, useCallback, useRef } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { applyDigitalSignature } from "@/engines/security-engine";
import { useAuroraStore } from "@/stores/aurora.store";
import type { DigitalSignOptions } from "@/engines/security-engine";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];
const CERT_ACCEPT = [
  { mime: "application/x-pkcs12", extension: ".p12" },
  { mime: "application/x-pkcs12", extension: ".pfx" },
];

export interface SignAppearanceConfig {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useDigitalSign() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const session = useFileSession({ accept: PDF_ACCEPT, generatePreview: true });

  // Certificate state
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certDataUrl, setCertDataUrl] = useState<string>("");
  const [certPassword, setCertPassword] = useState("");
  const [showCertPassword, setShowCertPassword] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  // Signature metadata
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");

  // Appearance config (position on page)
  const [appearance, setAppearance] = useState<SignAppearanceConfig>({
    pageIndex: 0,
    x: 50,
    y: 50,
    width: 200,
    height: 50,
  });

  const handleCertFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCertFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setCertDataUrl(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const processor = usePdfProcessor<DigitalSignOptions>({
    processFn: async (bytes, config, onProgress) => {
      return applyDigitalSignature(bytes, config, onProgress);
    },
    outputSuffix: "signed",
  });

  const handleApply = useCallback(() => {
    if (!session.file || !certDataUrl) return;
    processor.run(session.file, {
      pkcs12DataUrl: certDataUrl,
      password: certPassword,
      reason: reason || undefined,
      location: location || undefined,
      appearance: {
        pageIndex: appearance.pageIndex,
        x: appearance.x,
        y: appearance.y,
        width: appearance.width,
        height: appearance.height,
      },
    });
  }, [
    session.file,
    certDataUrl,
    certPassword,
    reason,
    location,
    appearance,
    processor,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setCertFile(null);
    setCertDataUrl("");
    setCertPassword("");
    setReason("");
    setLocation("");
    setAppearance({ pageIndex: 0, x: 50, y: 50, width: 200, height: 50 });
    if (certInputRef.current) certInputRef.current.value = "";
  }, [session]);

  const canSign =
    session.file !== null &&
    certDataUrl.length > 0 &&
    status === "idle" &&
    !processor.isPending;

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    file: session.file,
    pageCount: session.pageCount,
    preview: session.preview,
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    // Certificate
    certFile,
    certInputRef,
    handleCertFileChange,
    certPassword,
    setCertPassword,
    showCertPassword,
    setShowCertPassword,
    // Metadata
    reason,
    setReason,
    location,
    setLocation,
    // Appearance
    appearance,
    setAppearance,
    // Actions
    canSign,
    processor,
    handleApply,
    handleReset,
    PDF_ACCEPT,
    CERT_ACCEPT,
  };
}
