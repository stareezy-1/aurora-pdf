import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./index.css";
import * as pdfjsLib from "pdfjs-dist";
import { router } from "./router";
import { useAuroraStore } from "@/stores/aurora.store";
import { ErrorBoundary } from "@/error/ErrorBoundary";

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
