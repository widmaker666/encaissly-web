import { useAuthStore } from "@/stores/auth.store";
import styles from "./DuoModeToggle.module.css";

interface DuoModeToggleProps {
  /** "dark" = sur le menu latéral sombre ; "light" (défaut) = sur fond clair. */
  variant?: "light" | "dark";
  fullWidth?: boolean;
}

/** Bascule gérante / créatrice pour les comptes DUO (GERANTE_CREATRICE). */
export default function DuoModeToggle({ variant = "light", fullWidth }: DuoModeToggleProps) {
  const duoMode = useAuthStore((s) => s.duoMode);
  const setDuoMode = useAuthStore((s) => s.setDuoMode);

  const container = [styles.container, variant === "dark" ? styles.dark : "", fullWidth ? styles.full : ""].filter(Boolean).join(" ");

  return (
    <div className={container} role="group" aria-label="Vue active">
      <button
        type="button"
        className={duoMode === "GERANTE" ? `${styles.btn} ${styles.btnActive}` : styles.btn}
        onClick={() => setDuoMode("GERANTE")}
        aria-pressed={duoMode === "GERANTE"}
      >
        Gérante
      </button>
      <button
        type="button"
        className={duoMode === "CREATRICE" ? `${styles.btn} ${styles.btnActive}` : styles.btn}
        onClick={() => setDuoMode("CREATRICE")}
        aria-pressed={duoMode === "CREATRICE"}
      >
        Créatrice
      </button>
    </div>
  );
}
