export interface FaqEntry {
  question: string;
  answer: string;
}

export interface NavItem {
  label: string;
  to?: string; // internal React Router path
  href?: string; // external URL
  external?: boolean;
  variant?: "link" | "button";
}
