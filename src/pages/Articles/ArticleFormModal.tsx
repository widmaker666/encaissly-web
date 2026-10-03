import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { articleService } from "@/services/api";
import { getErrorMessage } from "@/lib/errors";
import type { Article } from "@/types";
import Modal from "@/components/Modal";
import styles from "../Ventes/VenteCreateModal.module.css"; // mêmes classes de formulaire

interface Props {
  open: boolean;
  onClose: () => void;
  /** L'article appartient soit à une créatrice (catalogue), soit à un événement (stock) — jamais les deux. */
  scope: { creatriceId: string } | { evenementId: string };
  /** Clé de cache à invalider après création/modification (["articles", creatriceId] ou ["articles-event", evenementId]). */
  invalidateKey: unknown[];
  /** Fournie = modification, absente = création. */
  article?: Article | null;
}

interface FormState {
  nom: string;
  description: string;
  prix: string;
  quantite: string;
}

const EMPTY: FormState = { nom: "", description: "", prix: "", quantite: "1" };

export default function ArticleFormModal({ open, onClose, scope, invalidateKey, article }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!article;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      article
        ? {
            nom: article.nom,
            description: article.description ?? "",
            prix: article.prixIndicatif != null ? String(article.prixIndicatif) : "",
            quantite: article.quantite != null ? String(article.quantite) : "1",
          }
        : EMPTY,
    );
  }, [open, article]);

  const { mutate, isPending } = useMutation({
    mutationFn: (dto: { nom: string; description?: string; prixIndicatif?: number; quantite?: number; creatriceId?: string; evenementId?: string }) =>
      isEdit ? articleService.update(article!.id, dto) : articleService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, isEdit ? "Impossible de modifier l'article." : "Impossible de créer l'article.")),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.nom.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    mutate({
      nom: form.nom.trim(),
      description: form.description.trim() || undefined,
      prixIndicatif: form.prix ? parseFloat(form.prix.replace(",", ".")) : undefined,
      quantite: form.quantite ? parseInt(form.quantite, 10) : undefined,
      ...(isEdit ? {} : scope),
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifier l'article" : "Nouvel article"}>
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
          placeholder="Ex : Bracelet bohème"
          required
        />

        <label className={styles.label} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          className={styles.input}
          style={{ marginBottom: 12, resize: "vertical", minHeight: 60 }}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description optionnelle…"
        />

        <label className={styles.label} htmlFor="prix">
          Prix indicatif (€)
        </label>
        <input
          id="prix"
          className={styles.input}
          style={{ marginBottom: 12 }}
          inputMode="decimal"
          value={form.prix}
          onChange={(e) => setForm((f) => ({ ...f, prix: e.target.value }))}
          placeholder="Ex : 12,50"
        />

        <label className={styles.label} htmlFor="quantite">
          Quantité en stock
        </label>
        <input
          id="quantite"
          className={styles.input}
          style={{ marginBottom: 16 }}
          inputMode="numeric"
          value={form.quantite}
          onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))}
          placeholder="Ex : 5"
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={!form.nom.trim() || isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
        </button>
      </form>
    </Modal>
  );
}
