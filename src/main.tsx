import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./index.css";
import * as pdfjsLib from "pdfjs-dist";
import { router } from "./router";
import { useAuroraStore } from "@/stores/aurora.store";
import { ErrorBoundary } from "@/error/ErrorBoundary";
import { Workbox } from "workbox-window";

// Register service worker via workbox-window (PWA)
if ("serviceWorker" in navigator) {
  const wb = new Workbox("/sw.js");

  // When a new SW is waiting to activate, store the registration so the
  // UpdateNotification component can prompt the user to reload.
  wb.addEventListener("waiting", () => {
    void wb.register().then((reg) => {
      if (reg) useAuroraStore.getState().setSwUpdate(reg);
    });
  });

  void wb.register();
}

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Apply saved theme to DOM immediately
const savedTheme = localStorage.getItem("aurora-pdf-theme") ?? "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

// Clear all in-memory file state when the tab is closed
window.addEventListener("beforeunload", () => {
  useAuroraStore.getState().clearWorkbox();
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>,
);
