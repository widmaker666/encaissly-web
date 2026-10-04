import type { ReactNode } from "react";
import styles from "./Notice.module.css";

/** Message discret dans un encart (chargement, liste vide…) — remplace le .notice dupliqué dans 9 fichiers. */
export default function Notice({ children }: { children: ReactNode }) {
  return <p className={styles.notice}>{children}</p>;
}
