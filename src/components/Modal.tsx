import { useEffect, type ReactNode } from "react";
import styles from "./Modal.module.css";

// Coquille de modale partagée — le mobile a 7 implémentations de "modale
// plein écran" quasi identiques (overlay + carte + croix de fermeture).
// Une seule ici, le contenu change selon l'usage (création, édition...).

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Largeur max de la carte, en px. Par défaut adapté à un formulaire simple. */
  maxWidth?: number;
}

export default function Modal({ open, onClose, title, children, maxWidth = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.card}
        style={{ maxWidth }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
