import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";
import { ScrollToTop } from "@/components/ScrollToTop/ScrollToTop";

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

function ToolPageSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00ff88",
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  );
}

function wrap(element: React.ReactNode) {
  return <Suspense fallback={<ToolPageSkeleton />}>{element}</Suspense>;
}

function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
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
    ],
  },
]);
