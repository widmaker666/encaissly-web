import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { venteService } from "@/services/api";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import type { ModePaiement, Vente } from "@/types";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import Table, { type Column } from "@/components/Table";
import { MODE_LABEL } from "@/lib/paiement";
import styles from "./MesVentes.module.css";

// Port de encaissly-mobile/pages/Boutique/MesVentes.tsx — vue en LECTURE
// SEULE : les ventes que la créatrice a faites dans une boutique où elle
// est membre. Pas de bouton d'ajout ici — c'est la gérante qui enregistre
// les ventes en boutique, pas la créatrice elle-même (même logique que mobile).
//
// Ownership scopé par boutiqueId + sa propre fiche créatrice côté backend,
// indépendamment du rôle/mode DUO — pas besoin de passer `mode` ici.

const paiementColor: Record<ModePaiement, "info" | "warning"> = {
  CARTE: "info",
  ESPECES: "warning",
};

const columns: Column<Vente>[] = [
  { key: "article", header: "Article", render: (v) => `${v.nomArticle}${(v.quantite ?? 1) > 1 ? ` × ${v.quantite}` : ""}` },
  { key: "date", header: "Date", render: (v) => formatDate(v.createdAt) },
  { key: "prix", header: "Prix", render: (v) => formatMontant(v.prixVente) },
  { key: "mode", header: "Paiement", render: (v) => <Badge color={paiementColor[v.modePaiement]}>{MODE_LABEL[v.modePaiement]}</Badge> },
];

export default function MesVentes() {
  const { boutiqueId = "" } = useParams<{ boutiqueId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nomBoutique = searchParams.get("nom") ?? "Boutique";

  const { data: res, isLoading } = useQuery({
    // take élevé : vue bornée à une seule boutique, pas de filtre/pagination
    // ici (juste une lecture perso) — la pagination par défaut (20) serait
    // une perte de données silencieuse pour cette vue.
    queryKey: ["mes-ventes-boutique", boutiqueId],
    queryFn: async () => {
      //- Le serveur plafonne une page à 100 ventes (take > 100 = erreur 400, écran vide) :
      //- on lit l'historique complet de cette boutique par blocs de 100.
      const toutes: Vente[] = [];
      for (let skip = 0; ; skip += 100) {
        const page = await venteService.getAll({ boutiqueId, skip, take: 100 });
        toutes.push(...page.data);
        if (!page.hasMore) break;
      }
      return { data: toutes };
    },
    enabled: !!boutiqueId,
  });
  const ventes = res?.data;

  const count = ventes?.length ?? 0;
  const ca = (ventes ?? []).reduce((acc, v) => acc + v.prixVente, 0);

  return (
    <div className={styles.page}>
      <Button variant="link" onClick={() => navigate("/")}>
        ‹ Tableau de bord
      </Button>

      <div>
        <h1 className={styles.title}>{nomBoutique}</h1>
        <p className={styles.subtitle}>
          {count} vente{count > 1 ? "s" : ""} · {formatMontant(ca)}
        </p>
      </div>

      {isLoading ? (
        <Notice>Chargement…</Notice>
      ) : count === 0 ? (
        <Notice>Aucune vente ici pour l'instant — tes ventes enregistrées dans cette boutique apparaîtront ici.</Notice>
      ) : (
        <Table columns={columns} rows={ventes ?? []} rowKey={(v) => v.id} />
      )}
    </div>
  );
}
