import Modal from "./Modal";
import styles from "./ConfirmDialog.module.css";

// Équivalent web de Alert.alert(...) — le mobile l'appelle ~40 fois pour
// confirmer une suppression. Un seul composant ici plutôt que de recoder une
// fenêtre à chaque écran.

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth={360}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={pending}>
          Annuler
        </button>
        <button
          type="button"
          className={danger ? styles.danger : styles.confirm}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
