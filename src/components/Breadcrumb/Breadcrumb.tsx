import { Link } from "react-router";
import { styles } from "./Breadcrumb.style";
import type { BreadcrumbProps } from "./Breadcrumb.types";

export function Breadcrumb({ toolName }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb navigation" style={styles.nav}>
      <Link to="/" style={styles.link}>
        Home
      </Link>
      <span style={styles.separator} aria-hidden="true">
        ›
      </span>
      <span style={styles.current} aria-current="page">
        {toolName}
      </span>
    </nav>
  );
}
