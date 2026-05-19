export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export interface ToolEntry {
  path: string;
  label: string;
  category: string;
  icon: string;
}
