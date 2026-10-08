import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { boutiqueService, creatriceService } from "@/services/api";
import { getErrorMessage } from "@/lib/errors";
import Modal from "@/components/Modal";
import styles from "../Ventes/VenteCreateModal.module.css"; // mêmes classes de formulaire

interface BoutiqueItem {
  id: string;
  nom: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  creatriceId: string;
}

export default function InviteModal({ open, onClose, creatriceId }: Props) {
  const [email, setEmail] = useState("");
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: boutiques, isLoading: loadingBoutiques } = useQuery<BoutiqueItem[]>({
    queryKey: ["boutiques-avec-stats"],
    queryFn: boutiqueService.getAvecStats,
    enabled: open,
  });

  // Boutique résolue : sélection manuelle, ou auto si une seule boutique existe.
  const effectiveBoutiqueId = selectedBoutiqueId ?? (boutiques?.length === 1 ? boutiques[0].id : null);
  const showBoutiquePicker = !!boutiques && boutiques.length > 1;

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setSelectedBoutiqueId(null);
    setError(null);
    setSuccess(null);
  }, [open]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => creatriceService.invite(creatriceId, email.trim(), effectiveBoutiqueId!),
    onSuccess: () => {
      setSuccess("Invitation envoyée ✓");
      setTimeout(onClose, 1400);
    },
    onError: (err) => setError(getErrorMessage(err, "Erreur lors de l'invitation.")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim()) {
      setError("L'email est obligatoire.");
      return;
    }
    if (!effectiveBoutiqueId) {
      setError("Choisis une boutique.");
      return;
    }
    mutate();
  }

  const canSubmit = email.trim().length > 0 && !!effectiveBoutiqueId && !isPending;

  return (
    <Modal open={open} onClose={onClose} title="Inviter cette créatrice">
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="invite-email">
          Email de la personne *
        </label>
        <input
          id="invite-email"
          className={styles.input}
          style={{ marginBottom: 16 }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="marie@example.com"
          required
        />

        {loadingBoutiques ? (
          <p className={styles.hint}>Chargement des boutiques…</p>
        ) : boutiques?.length === 0 ? (
          <p className={styles.error} style={{ marginBottom: 16 }}>
            Tu n'as pas encore de boutique — crée-en une depuis le Tableau de bord avant d'inviter.
          </p>
        ) : boutiques?.length === 1 ? (
          <div style={{ marginBottom: 16 }}>
            <label className={styles.label}>Boutique</label>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-bold)" }}>{boutiques[0].nom}</p>
          </div>
        ) : showBoutiquePicker ? (
          <>
            <label className={styles.label}>Boutique *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {boutiques!.map((b) => (
                <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="radio" name="boutique" checked={selectedBoutiqueId === b.id} onChange={() => setSelectedBoutiqueId(b.id)} />
                  {b.nom}
                </label>
              ))}
            </div>
          </>
        ) : null}

        {success && <p style={{ color: "var(--color-success-text)", fontSize: "var(--size-sm)", marginBottom: 12 }}>{success}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          {isPending ? "Envoi…" : "Envoyer l'invitation"}
        </button>
      </form>
    </Modal>
  );
}
