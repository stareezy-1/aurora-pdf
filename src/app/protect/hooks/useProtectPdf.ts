import { useState } from "react";
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useAuroraStore } from "@/stores/aurora.store";
import { encryptWithPassword } from "@/engines/pdf-engine";
import { buildOutputFilename } from "@/lib/filename-utils";

export type PasswordStrength = "weak" | "medium" | "strong";

function computePasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  if (password.length >= 12) {
    // Strong: length >= 12 with mixed chars (letters + digits or symbols)
    const hasMixed =
      /[a-zA-Z]/.test(password) &&
      (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password));
    if (hasMixed) return "strong";
  }
  // Medium: length 8–11 (or 12+ without mixed chars)
  return "medium";
}

export function useProtectPdf() {
  const {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
  } = useAuroraStore();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const passwordsMatch = password.length > 0 && password === repeatPassword;
  const passwordStrength: PasswordStrength = computePasswordStrength(password);

  const processor = useFileProcessor({
    process: async (file, onProgress) => {
      onProgress(10, "Loading PDF…");
      const bytes = new Uint8Array(await file.arrayBuffer());
      onProgress(40, "Encrypting PDF…");
      const result = await encryptWithPassword(bytes, password);
      onProgress(100, "Done");
      return {
        blob: new Blob([result as unknown as BlobPart], {
          type: "application/pdf",
        }),
        filename: buildOutputFilename(file.name, "protect"),
      };
    },
  });

  function handleFileDrop(files: File[]) {
    setPdfFile(files[0]);
  }

  function handleReset() {
    clearWorkbox();
    setPdfFile(null);
    setPassword("");
    setRepeatPassword("");
    setShowPassword(false);
    setShowRepeatPassword(false);
  }

  return {
    status,
    progress,
    progressLabel,
    errorMessage,
    resultBlobUrl,
    outputFilename,
    clearWorkbox,
    pdfFile,
    password,
    setPassword,
    repeatPassword,
    setRepeatPassword,
    showPassword,
    setShowPassword,
    showRepeatPassword,
    setShowRepeatPassword,
    passwordsMatch,
    passwordStrength,
    processor,
    handleFileDrop,
    handleReset,
  };
}
