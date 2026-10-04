import type { ReactNode } from "react";
import styles from "./Banner.module.css";

/** Bandeau succès/erreur pleine largeur — remplace successBanner/errorBanner dupliqués. */
export default function Banner({ variant, children }: { variant: "success" | "error"; children: ReactNode }) {
  return <div className={`${styles.banner} ${styles[variant]}`}>{children}</div>;
}
