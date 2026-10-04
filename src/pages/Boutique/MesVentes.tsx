import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { venteService } from "@/services/api";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import type { Vente } from "@/types";
import styles from "./MesVentes.module.css";

// Port de encaissly-mobile/pages/Boutique/MesVentes.tsx — vue en LECTURE
// SEULE : les ventes que la créatrice a faites dans une boutique où elle
// est membre. Pas de bouton d'ajout ici — c'est la gérante qui enregistre
// les ventes en boutique, pas la créatrice elle-même (même logique que mobile).
//
// Ownership scopé par boutiqueId + sa propre fiche créatrice côté backend,
// indépendamment du rôle/mode DUO — pas besoin de passer `mode` ici.

export default function MesVentes() {
  const { boutiqueId = "" } = useParams<{ boutiqueId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nomBoutique = searchParams.get("nom") ?? "Boutique";

  const { data: ventes, isLoading } = useQuery<Vente[]>({
    queryKey: ["mes-ventes-boutique", boutiqueId],
    queryFn: () => venteService.getAll({ boutiqueId }),
    enabled: !!boutiqueId,
  });

  const count = ventes?.length ?? 0;
  const ca = (ventes ?? []).reduce((acc, v) => acc + v.prixVente, 0);

  return (
    <div>
      <button type="button" className={styles.backBtn} onClick={() => navigate("/")}>
        ‹ Tableau de bord
      </button>

      <h2>{nomBoutique}</h2>
      <p className={styles.subtitle}>
        {count} vente{count > 1 ? "s" : ""} · {formatMontant(ca)}
      </p>

      {isLoading ? (
        <p className={styles.notice}>Chargement…</p>
      ) : count === 0 ? (
        <p className={styles.notice}>Aucune vente ici pour l'instant — tes ventes enregistrées dans cette boutique apparaîtront ici.</p>
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
            {ventes!.map((v) => (
              <tr key={v.id}>
                <td>
                  {v.nomArticle}
                  {(v.quantite ?? 1) > 1 ? ` × ${v.quantite}` : ""}
                </td>
                <td>{formatDate(v.createdAt)}</td>
                <td>{formatMontant(v.prixVente)}</td>
                <td>
                  <span className={v.modePaiement === "ESPECES" ? styles.badgeEspeces : styles.badgeCarte}>{v.modePaiement}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
