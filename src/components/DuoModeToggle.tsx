import { useAuthStore } from "@/stores/auth.store";
import styles from "./DuoModeToggle.module.css";

/** Bascule gérante / créatrice pour les comptes DUO (GERANTE_CREATRICE). */
export default function DuoModeToggle() {
  const duoMode = useAuthStore((s) => s.duoMode);
  const setDuoMode = useAuthStore((s) => s.setDuoMode);

  return (
    <div className={styles.container}>
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
