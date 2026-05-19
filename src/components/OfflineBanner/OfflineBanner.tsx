import { useAuroraStore } from "@/stores/aurora.store";

interface OfflineBannerProps {
  mode: "url" | "file";
}

/**
 * OfflineBanner — amber alert shown on HtmlToPdfPage when offline and in URL mode.
 *
 * Only renders when `isOnline === false && mode === 'url'`.
 *
 * Requirements: 35.1, 35.2, 35.3
 */
export function OfflineBanner({ mode }: OfflineBannerProps) {
  const isOnline = useAuroraStore((s) => s.isOnline);

  if (isOnline || mode !== "url") return null;

  return (
    <div className="alert alert-warning" role="alert">
      HTML-to-PDF requires an internet connection to fetch the URL. Connect to
      the internet to use this tool.
    </div>
  );
}
