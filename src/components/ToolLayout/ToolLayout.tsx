import { Suspense } from "react";
import { useLocation } from "react-router";
import { NavBar } from "@/components/NavBar/NavBar";
import { Breadcrumb } from "@/components/Breadcrumb/Breadcrumb";
import { Footer } from "@/components/Footer/Footer";
import type { ToolLayoutProps } from "./ToolLayout.types";

function Skeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginTop: 24,
      }}
    >
      {[200, 120, 80].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            borderRadius: "var(--radius-lg)",
            background:
              "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ))}
    </div>
  );
}

export function ToolLayout({
  toolName,
  children,
  wide = false,
}: ToolLayoutProps) {
  const location = useLocation();
  return (
    <div
      className="page-wrap"
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <NavBar currentPath={location.pathname} />
      {wide ? (
        <Suspense
          fallback={
            <div className="page-main">
              <Skeleton />
            </div>
          }
        >
          {children}
        </Suspense>
      ) : (
        <main className="page-main" style={{ flex: 1 }}>
          <Breadcrumb toolName={toolName} />
          <Suspense fallback={<Skeleton />}>{children}</Suspense>
        </main>
      )}
      {!wide && <Footer />}
    </div>
  );
}
