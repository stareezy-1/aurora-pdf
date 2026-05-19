import { Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { NavBar } from "@/components/NavBar/NavBar";
import { Breadcrumb } from "@/components/Breadcrumb/Breadcrumb";
import { Footer } from "@/components/Footer/Footer";
import { ToolPageSkeleton } from "@/components/ToolPageSkeleton/ToolPageSkeleton";
import { useAuroraStore } from "@/stores/aurora.store";
import type { ToolLayoutProps } from "./ToolLayout.types";

export function ToolLayout({
  toolName,
  children,
  wide = false,
}: ToolLayoutProps) {
  const location = useLocation();
  const status = useAuroraStore((s) => s.status);
  const [liveText, setLiveText] = useState("");

  // Announce status changes to screen readers
  useEffect(() => {
    if (status === "processing") {
      setLiveText("Processing started");
    } else if (status === "success") {
      setLiveText("Processing complete. Your file is ready to download.");
    }
  }, [status]);

  return (
    <div
      className="page-wrap"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      {/* Hidden aria-live region for status announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {liveText}
      </div>

      <NavBar currentPath={location.pathname} />
      {wide ? (
        <Suspense
          fallback={
            <div className="page-main">
              <ToolPageSkeleton wide={wide} />
            </div>
          }
        >
          {/* On desktop: fixed height with internal scroll. On mobile: natural height, page scrolls */}
          <div
            key={location.pathname}
            className="page-transition"
            style={{ flex: 1, overflowX: "hidden" }}
          >
            {children}
          </div>
        </Suspense>
      ) : (
        <main className="page-main" style={{ flex: 1 }}>
          <Breadcrumb toolName={toolName} />
          <Suspense fallback={<ToolPageSkeleton wide={wide} />}>
            <div key={location.pathname} className="page-transition">
              {children}
            </div>
          </Suspense>
        </main>
      )}
      {!wide && <Footer />}
    </div>
  );
}
