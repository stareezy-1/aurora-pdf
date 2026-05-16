import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  | "idle"
  | "available"
  | "installing"
  | "installed"
  | "dismissed";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>("idle");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Already installed — running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setState("installed");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("available");
      // Show modal after a short delay so it doesn't pop up immediately on load
      setTimeout(() => setShowModal(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setState("installed");
      setShowModal(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    setState("installing");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setState("installed");
    } else {
      setState("dismissed");
    }
    setDeferredPrompt(null);
    setShowModal(false);
  }

  function dismiss() {
    setState("dismissed");
    setShowModal(false);
    // Don't show again for 7 days
    localStorage.setItem("pwa-dismissed", String(Date.now()));
  }

  function openModal() {
    if (state === "available") setShowModal(true);
  }

  return { state, showModal, install, dismiss, openModal };
}
