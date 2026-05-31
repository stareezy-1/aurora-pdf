/**
 * useProtectPdf (upgraded) — hook for the Protect/Decrypt PDF tool.
 * Supports user + owner passwords, permissions, encryption selector (RC4/AES),
 * and remove-password flow.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { useState, useCallback } from "react";
import { useFileSession } from "@/hooks/useFileSession";
import { usePdfProcessor } from "@/hooks/usePdfProcessor";
import { encryptPdf, decryptPdf } from "@/engines/security-engine";
import { useAuroraStore } from "@/stores/aurora.store";

export type PasswordStrength = "weak" | "medium" | "strong";
export type EncryptionAlgorithm = "rc4-128" | "aes-256";
export type ToolMode = "encrypt" | "decrypt";

const PDF_ACCEPT = [{ mime: "application/pdf", extension: ".pdf" }];

function computePasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  if (password.length >= 12) {
    const hasMixed =
      /[a-zA-Z]/.test(password) &&
      (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password));
    if (hasMixed) return "strong";
  }
  return "medium";
}

export interface EncryptConfig {
  mode: "encrypt";
  userPassword: string;
  ownerPassword: string;
  algorithm: EncryptionAlgorithm;
  permissions: {
    print: boolean;
    copy: boolean;
    edit: boolean;
    annotate: boolean;
  };
}

export interface DecryptConfig {
  mode: "decrypt";
  password: string;
}

export type ProtectConfig = EncryptConfig | DecryptConfig;

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

  const session = useFileSession({ accept: PDF_ACCEPT });

  const [mode, setMode] = useState<ToolMode>("encrypt");
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [algorithm, setAlgorithm] = useState<EncryptionAlgorithm>("aes-256");
  const [permissions, setPermissions] = useState({
    print: true,
    copy: false,
    edit: false,
    annotate: false,
  });

  // Decrypt mode
  const [decryptPassword, setDecryptPassword] = useState("");
  const [showDecryptPassword, setShowDecryptPassword] = useState(false);

  const passwordsMatch =
    userPassword.length > 0 && userPassword === repeatPassword;
  const passwordStrength: PasswordStrength =
    computePasswordStrength(userPassword);

  const processor = usePdfProcessor<ProtectConfig>({
    processFn: async (bytes, config, onProgress) => {
      if (config.mode === "encrypt") {
        return encryptPdf(
          bytes,
          {
            userPassword: config.userPassword,
            ownerPassword: config.ownerPassword || config.userPassword,
            algorithm: config.algorithm,
            permissions: config.permissions,
          },
          onProgress,
        );
      } else {
        return decryptPdf(bytes, config.password, onProgress);
      }
    },
    outputSuffix: mode === "encrypt" ? "protected" : "decrypted",
  });

  const handleApply = useCallback(() => {
    if (!session.file) return;
    if (mode === "encrypt") {
      processor.run(session.file, {
        mode: "encrypt",
        userPassword,
        ownerPassword,
        algorithm,
        permissions,
      });
    } else {
      processor.run(session.file, {
        mode: "decrypt",
        password: decryptPassword,
      });
    }
  }, [
    session.file,
    mode,
    userPassword,
    ownerPassword,
    algorithm,
    permissions,
    decryptPassword,
    processor,
  ]);

  const handleReset = useCallback(() => {
    session.reset();
    setUserPassword("");
    setOwnerPassword("");
    setRepeatPassword("");
    setDecryptPassword("");
    setShowUserPassword(false);
    setShowOwnerPassword(false);
    setShowRepeatPassword(false);
    setShowDecryptPassword(false);
  }, [session]);

  const togglePermission = useCallback((key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const canEncrypt =
    session.file !== null &&
    userPassword.length > 0 &&
    passwordsMatch &&
    status === "idle" &&
    !processor.isPending;

  const canDecrypt =
    session.file !== null &&
    decryptPassword.length > 0 &&
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
    isLoading: session.isLoading,
    handleFileDrop: session.handleDrop,
    mode,
    setMode,
    // Encrypt fields
    userPassword,
    setUserPassword,
    ownerPassword,
    setOwnerPassword,
    repeatPassword,
    setRepeatPassword,
    showUserPassword,
    setShowUserPassword,
    showOwnerPassword,
    setShowOwnerPassword,
    showRepeatPassword,
    setShowRepeatPassword,
    passwordsMatch,
    passwordStrength,
    algorithm,
    setAlgorithm,
    permissions,
    togglePermission,
    // Decrypt fields
    decryptPassword,
    setDecryptPassword,
    showDecryptPassword,
    setShowDecryptPassword,
    // Actions
    canEncrypt,
    canDecrypt,
    processor,
    handleApply,
    handleReset,
    PDF_ACCEPT,
  };
}
