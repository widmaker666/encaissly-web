import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { venteService } from "@/services/api";
import { getErrorMessage } from "@/lib/errors";
import type { ModePaiement, Vente } from "@/types";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import styles from "./VenteCreateModal.module.css";

// Champs volontairement limités à ce qui peut vraiment se tromper (nom,
// prix, mode de paiement, commission) — pas de réassignation de
// créatrice/boutique depuis ici, comme sur mobile.

const INVALIDATE_KEYS = ["ventes", "stats", "stats-global", "stats-top-articles", "stats-historique", "stats-par-creatrice", "ventes-recent"];

export default function VenteEditModal({ vente, onClose }: { vente: Vente | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const open = vente != null;

  const [nomArticle, setNomArticle] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [modePaiement, setModePaiement] = useState<ModePaiement>("ESPECES");
  const [sansCommission, setSansCommission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (vente) {
      setNomArticle(vente.nomArticle);
      setPrixVente(vente.prixVente.toString().replace(".", ","));
      setModePaiement(vente.modePaiement);
      setSansCommission(vente.sansCommission ?? false);
      setError(null);
      setConfirmDelete(false);
    }
  }, [vente]);

  function invalidateTout() {
    INVALIDATE_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!vente) return;
    const prix = parseFloat(prixVente.replace(",", "."));
    if (!nomArticle.trim() || isNaN(prix) || prix <= 0) {
      setError("Vérifie les champs et réessaye.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await venteService.update(vente.id, { nomArticle: nomArticle.trim(), prixVente: prix, modePaiement, sansCommission });
      invalidateTout();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!vente) return;
    setDeleting(true);
    try {
      await venteService.remove(vente.id);
      invalidateTout();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Modifier la vente">
        <form className={styles.form} onSubmit={handleSave}>
          <label className={styles.label} htmlFor="nomArticle">
            Nom de l'article
          </label>
          <input
            id="nomArticle"
            className={styles.input}
            value={nomArticle}
            onChange={(e) => setNomArticle(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <label className={styles.label} htmlFor="prixVente">
            Prix (€)
          </label>
          <input
            id="prixVente"
            className={styles.input}
            inputMode="decimal"
            value={prixVente}
            onChange={(e) => setPrixVente(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <div className={styles.paymentRow} style={{ marginTop: 0 }}>
            <div className={styles.modeGroup}>
              {(["ESPECES", "CARTE"] as ModePaiement[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={modePaiement === m ? `${styles.modeChip} ${styles.modeChipActive}` : styles.modeChip}
                  onClick={() => {
                    setModePaiement(m);
                    if (m !== "ESPECES") setSansCommission(false);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            {modePaiement === "ESPECES" && (
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={sansCommission} onChange={(e) => setSansCommission(e.target.checked)} />
                Pas de commission sur cette vente
              </label>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={pending || deleting}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            className={styles.removeBtn}
            style={{ marginTop: 12, alignSelf: "center" }}
            onClick={() => setConfirmDelete(true)}
            disabled={pending || deleting}
          >
            Supprimer cette vente
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette vente"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        danger
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
