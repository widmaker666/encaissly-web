import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creatriceService } from "@/services/api";
import { getErrorMessage } from "@/lib/errors";
import { formatMontant } from "@/lib/money";
import { formatDateLong } from "@/lib/date";
import type { CreatriceDetail as CreatriceDetailType, VenteDetail } from "@/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import VentesExportButtons from "@/components/VentesExportButtons";
import CreatriceFormModal from "./CreatriceFormModal";
import styles from "./CreatriceDetail.module.css";

// Regroupe les lignes identiques (même article, même mode de paiement) —
// une vente de quantité 3 arrive en base comme 1 ligne avec `quantite: 3`,
// mais plusieurs achats séparés du même article arrivent en plusieurs
// lignes : on les fusionne pour l'affichage, comme sur mobile.
function groupVentes(ventes: VenteDetail[]) {
  const map = new Map<string, VenteDetail & { quantite: number }>();
  for (const v of ventes) {
    const key = `${v.nomArticle}-${v.modePaiement}`;
    const existing = map.get(key);
    const qte = (v as unknown as { quantite?: number }).quantite ?? 1;
    if (existing) {
      existing.quantite += qte;
      existing.prixVente += v.prixVente;
    } else {
      map.set(key, { ...v, quantite: qte });
    }
  }
  return Array.from(map.values());
}

export default function CreatriceDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: creatrice, isLoading } = useQuery<CreatriceDetailType>({
    queryKey: ["creatrice", id],
    queryFn: () => creatriceService.getOne(id),
    enabled: !!id,
  });

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => creatriceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatrices"] });
      navigate("/creatrices");
    },
    onError: (err) => alert(getErrorMessage(err, "Impossible de supprimer la créatrice.")),
  });

  if (isLoading) return <p className={styles.notice}>Chargement…</p>;
  if (!creatrice) return <p className={styles.notice}>Créatrice introuvable.</p>;

  const initiales = creatrice.nom.substring(0, 2).toUpperCase();

  return (
    <div>
      <button type="button" className={styles.backBtn} onClick={() => navigate("/creatrices")}>
        ‹ Toutes les créatrices
      </button>

      <div className={styles.header}>
        <div className={styles.avatar}>{initiales}</div>
        <div>
          <h2>{creatrice.nom}</h2>
          <span className={styles.commissionBadge}>{creatrice.tauxDeCommission}% de commission</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.editBtn} onClick={() => setEditOpen(true)}>
            Modifier
          </button>
          <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
            Supprimer
          </button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(creatrice.stats.ca)}</div>
          <div className={styles.statLabel}>Chiffre d'affaires</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{creatrice.stats.nbVentes}</div>
          <div className={styles.statLabel}>Ventes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(creatrice.stats.totalCommission)}</div>
          <div className={styles.statLabel}>Commission totale</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(creatrice.stats.netCreatrice)}</div>
          <div className={styles.statLabel}>Net créatrice</div>
        </div>
      </div>

      <p className={styles.notice} style={{ marginTop: 16 }}>
        Catalogue d'articles : arrive à l'étape 2 sur le web.
      </p>

      <h3 className={styles.sectionTitle}>Récupérer ses ventes</h3>
      <VentesExportButtons
        creatriceId={creatrice.id}
        filenameBase={`ventes-${creatrice.nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      />

      <h3 className={styles.sectionTitle}>Ventes ({creatrice.ventes.length})</h3>
      {creatrice.ventes.length === 0 ? (
        <p className={styles.notice}>Aucune vente enregistrée.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Article</th>
              <th>Date</th>
              <th>Prix</th>
              <th>Paiement</th>
            </tr>
          </thead>
          <tbody>
            {groupVentes(creatrice.ventes).map((v) => (
              <tr key={v.id}>
                <td>
                  {v.nomArticle}
                  {v.quantite > 1 ? ` × ${v.quantite}` : ""}
                </td>
                <td>{formatDateLong(v.createdAt)}</td>
                <td>{formatMontant(v.prixVente)}</td>
                <td>
                  <span className={v.modePaiement === "ESPECES" ? styles.badgeEspeces : styles.badgeCarte}>
                    {v.modePaiement}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CreatriceFormModal open={editOpen} onClose={() => setEditOpen(false)} creatrice={creatrice} />

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette créatrice"
        message={`Supprimer ${creatrice.nom} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        pending={deleting}
        onConfirm={() => remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
