import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type Color = "primary" | "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  children: ReactNode;
  color?: Color;
  variant?: "soft" | "solid";
}

/** Pastille de statut — remplace badgeEspeces/Carte/Pro/Duo/typeBadge/prixBadge etc. */
export default function Badge({ children, color = "neutral", variant = "soft" }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[color]} ${styles[variant]}`}>{children}</span>;
}
