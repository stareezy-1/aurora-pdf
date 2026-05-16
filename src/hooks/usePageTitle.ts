import { useEffect } from "react";
import { formatPageTitle } from "@/lib/format-utils";

/**
 * Sets document.title on mount.
 * Pass null/undefined to use the home page title.
 */
export function usePageTitle(toolName?: string | null): void {
  useEffect(() => {
    document.title = toolName
      ? formatPageTitle(toolName)
      : "AuroraPDF — Zero-Server PDF Tools";
  }, [toolName]);
}
