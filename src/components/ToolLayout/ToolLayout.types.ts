import type { ReactNode } from "react";

export interface ToolLayoutProps {
  toolName: string;
  children: ReactNode;
  wide?: boolean;
}
