import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

// Coquille de modale partagée — le mobile a 7 implémentations de "modale
// plein écran" quasi identiques (overlay + carte + croix de fermeture).
// Une seule ici, le contenu change selon l'usage (création, édition...).

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Largeur max de la carte, en px. Par défaut adapté à un formulaire simple. */
  maxWidth?: number;
}

export default function Modal({ open, onClose, title, children, maxWidth = 480 }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Piège le focus clavier à l'intérieur de la modale (Tab/Shift+Tab ne
      // doivent pas en sortir vers la page derrière) — sinon on perd le fil
      // au clavier dès qu'une modale (création/édition/confirmation...) est ouverte.
      if (e.key === "Tab" && cardRef.current) {
        const focusables = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Déplace le focus clavier dans la modale à l'ouverture, et le restitue au
  // déclencheur (ex: bouton "+ Ajouter") à la fermeture. On vise le premier
  // champ du CONTENU plutôt que le bouton de fermeture (qui précède le
  // contenu dans le DOM) — sinon le premier Tab atterrit systématiquement
  // sur la croix au lieu du premier champ du formulaire.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const bodyEl = cardRef.current?.querySelector<HTMLElement>(`.${styles.body}`);
    const first = bodyEl?.querySelector<HTMLElement>(FOCUSABLE) ?? cardRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? cardRef.current)?.focus();
    return () => previouslyFocused?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={cardRef}
        className={styles.card}
        style={{ maxWidth }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
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
