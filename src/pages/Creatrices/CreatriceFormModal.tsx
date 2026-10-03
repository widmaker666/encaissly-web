import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { creatriceService } from "@/services/api";
import { getErrorMessage } from "@/lib/errors";
import type { Creatrice } from "@/types";
import Modal from "@/components/Modal";
import styles from "../Ventes/VenteCreateModal.module.css"; // mêmes classes de formulaire, pas la peine de dupliquer

// Un seul composant pour création ET modification — mêmes champs des deux
// côtés sur mobile (ModalCreation.tsx / ModalModifier.tsx), inutile de les
// garder séparés ici.

interface FormState {
  nom: string;
  email: string;
  telephone: string;
  tauxDeCommission: string;
}

const EMPTY: FormState = { nom: "", email: "", telephone: "", tauxDeCommission: "" };

interface Props {
  open: boolean;
  onClose: () => void;
  /** Fournie = mode modification, absente = mode création. */
  creatrice?: Creatrice;
}

export default function CreatriceFormModal({ open, onClose, creatrice }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!creatrice;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      creatrice
        ? {
            nom: creatrice.nom,
            email: creatrice.email ?? "",
            telephone: creatrice.telephone ?? "",
            tauxDeCommission: String(creatrice.tauxDeCommission),
          }
        : EMPTY,
    );
  }, [open, creatrice]);

  const { mutate, isPending } = useMutation({
    mutationFn: (dto: { nom: string; email?: string; telephone?: string; tauxDeCommission: number }) =>
      isEdit ? creatriceService.update(creatrice!.id, dto) : creatriceService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatrices"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["creatrice", creatrice!.id] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, isEdit ? "Erreur lors de la modification." : "Erreur lors de la création.")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nom.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    const taux = parseFloat(form.tauxDeCommission.replace(",", "."));
    if (isNaN(taux) || taux < 0 || taux > 100) {
      setError("Taux de commission invalide (0–100).");
      return;
    }
    mutate({ nom: form.nom.trim(), email: form.email.trim() || undefined, telephone: form.telephone.trim() || undefined, tauxDeCommission: taux });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifier la créatrice" : "Nouvelle créatrice"}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="nom">
          Nom *
        </label>
        <input
          id="nom"
          className={styles.input}
          style={{ marginBottom: 12 }}
          value={form.nom}
          onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
          placeholder="Marie Dupont"
          required
        />

        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={styles.input}
          style={{ marginBottom: 12 }}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="marie@example.com"
        />

        <label className={styles.label} htmlFor="telephone">
          Téléphone
        </label>
        <input
          id="telephone"
          className={styles.input}
          style={{ marginBottom: 12 }}
          value={form.telephone}
          onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
          placeholder="06 12 34 56 78"
        />

        <label className={styles.label} htmlFor="taux">
          Taux de commission (%) *
        </label>
        <input
          id="taux"
          className={styles.input}
          style={{ marginBottom: 16 }}
          inputMode="decimal"
          value={form.tauxDeCommission}
          onChange={(e) => setForm((f) => ({ ...f, tauxDeCommission: e.target.value }))}
          placeholder="15"
          required
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la créatrice"}
        </button>
      </form>
    </Modal>
  );
}
