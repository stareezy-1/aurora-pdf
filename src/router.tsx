import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";
import { ScrollToTop } from "@/components/ScrollToTop/ScrollToTop";
import { ToolPageSkeleton } from "@/components/ToolPageSkeleton/ToolPageSkeleton";
import { CommandPalette } from "@/components/CommandPalette/CommandPalette";
import { KeyboardShortcutPanel } from "@/components/KeyboardShortcutPanel/KeyboardShortcutPanel";
import { UpdateNotification } from "@/components/UpdateNotification/UpdateNotification";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSwUpdate } from "@/hooks/useSwUpdate";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAuroraStore } from "@/stores/aurora.store";

const HomePage = lazy(() => import("@/app/home/HomePage"));
const CompressPdfPage = lazy(() => import("@/app/compress/CompressPdfPage"));
const OcrPage = lazy(() => import("@/app/ocr/OcrPage"));
const PdfToJpgPage = lazy(() => import("@/app/pdf-to-jpg/PdfToJpgPage"));
const PdfToWordPage = lazy(() => import("@/app/pdf-to-word/PdfToWordPage"));
const WordToPdfPage = lazy(() => import("@/app/word-to-pdf/WordToPdfPage"));
const PdfToExcelPage = lazy(() => import("@/app/pdf-to-excel/PdfToExcelPage"));
const ExcelToPdfPage = lazy(() => import("@/app/excel-to-pdf/ExcelToPdfPage"));
const EditPdfPage = lazy(() => import("@/app/edit/EditPdfPage"));
const SignPdfPage = lazy(() => import("@/app/sign/SignPdfPage"));
const WatermarkPage = lazy(() => import("@/app/watermark/WatermarkPage"));
const SplitPdfPage = lazy(() => import("@/app/split/SplitPdfPage"));
const HtmlToPdfPage = lazy(() => import("@/app/html-to-pdf/HtmlToPdfPage"));
const OrganizePdfPage = lazy(() => import("@/app/organize/OrganizePdfPage"));
const ProtectPdfPage = lazy(() => import("@/app/protect/ProtectPdfPage"));
const SearchablePdfPage = lazy(
  () => import("@/app/searchable-pdf/SearchablePdfPage"),
);

function wrap(element: React.ReactNode) {
  return <Suspense fallback={<ToolPageSkeleton />}>{element}</Suspense>;
}

function RootLayout() {
  // Wire global hooks
  useOnlineStatus();
  useSwUpdate();
  useCommandPalette();
  useKeyboardShortcuts();

  // Read overlay state from store
  const commandPaletteOpen = useAuroraStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useAuroraStore((s) => s.closeCommandPalette);
  const shortcutPanelOpen = useAuroraStore((s) => s.shortcutPanelOpen);
  const toggleShortcutPanel = useAuroraStore((s) => s.toggleShortcutPanel);
  const swUpdateAvailable = useAuroraStore((s) => s.swUpdateAvailable);
  const dismissSwUpdate = useAuroraStore((s) => s.dismissSwUpdate);
  const swRegistration = useAuroraStore((s) => s.swRegistration);

  function handleReload() {
    swRegistration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }

  return (
    <>
      <ScrollToTop />
      <Outlet />

      {/* Command palette — always mounted, portal-rendered */}
      <CommandPalette open={commandPaletteOpen} onClose={closeCommandPalette} />

      {/* Keyboard shortcut panel — always mounted, portal-rendered */}
      <KeyboardShortcutPanel
        open={shortcutPanelOpen}
        onClose={toggleShortcutPanel}
      />

      {/* SW update notification — shown only when an update is waiting */}
      {swUpdateAvailable && (
        <UpdateNotification
          onReload={handleReload}
          onDismiss={dismissSwUpdate}
        />
      )}
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: wrap(<HomePage />) },
      { path: "/compress", element: wrap(<CompressPdfPage />) },
      { path: "/ocr", element: wrap(<OcrPage />) },
      { path: "/pdf-to-jpg", element: wrap(<PdfToJpgPage />) },
      { path: "/pdf-to-word", element: wrap(<PdfToWordPage />) },
      { path: "/word-to-pdf", element: wrap(<WordToPdfPage />) },
      { path: "/pdf-to-excel", element: wrap(<PdfToExcelPage />) },
      { path: "/excel-to-pdf", element: wrap(<ExcelToPdfPage />) },
      { path: "/edit", element: wrap(<EditPdfPage />) },
      { path: "/sign", element: wrap(<SignPdfPage />) },
      { path: "/watermark", element: wrap(<WatermarkPage />) },
      { path: "/split", element: wrap(<SplitPdfPage />) },
      { path: "/html-to-pdf", element: wrap(<HtmlToPdfPage />) },
      { path: "/organize", element: wrap(<OrganizePdfPage />) },
      { path: "/protect", element: wrap(<ProtectPdfPage />) },
      { path: "/searchable-pdf", element: wrap(<SearchablePdfPage />) },
    ],
  },
]);
