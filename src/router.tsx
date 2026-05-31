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
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

const HomePage = lazy(() => import("@/app/home/HomePage"));
const AboutPage = lazy(() => import("@/app/about/AboutPage"));
const FaqPage = lazy(() => import("@/app/faq/FaqPage"));
const TermsPage = lazy(() => import("@/app/terms/TermsPage"));

function wrap(element: React.ReactNode) {
  return <Suspense fallback={<ToolPageSkeleton />}>{element}</Suspense>;
}

function RootLayout() {
  // Wire global hooks
  useOnlineStatus();
  useSwUpdate();
  useCommandPalette();
  useKeyboardShortcuts();
  usePageAnalytics(); // track page views on every route change

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

// Derive tool routes from TOOL_REGISTRY — adding a new tool only requires
// a single entry in the registry; no manual route additions needed here.
const toolRoutes = TOOL_REGISTRY.map((tool) => ({
  path: tool.path,
  element: wrap(<tool.component />),
}));

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: wrap(<HomePage />) },

      // Site pages
      { path: "/about", element: wrap(<AboutPage />) },
      { path: "/faq", element: wrap(<FaqPage />) },
      { path: "/terms", element: wrap(<TermsPage />) },

      // Tool routes — derived from TOOL_REGISTRY
      ...toolRoutes,
    ],
  },
]);
