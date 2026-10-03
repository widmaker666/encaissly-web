import { useParams, useSearchParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/api";
import { formatMontant } from "@/lib/money";
import VentesExportButtons from "@/components/VentesExportButtons";
import RapportExportButtons from "@/components/RapportExportButtons";
import styles from "./BoutiqueDetail.module.css";

// Port de encaissly-mobile/pages/Boutique/Detail.tsx — stats de la
// boutique + ses deux types d'export (rapport classique via
// RapportExportButtons, détail des ventes via VentesExportButtons,
// composants déjà construits pour le Dashboard/Stats/fiche créatrice).

export default function BoutiqueDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const nom = searchParams.get("nom") ?? "Boutique";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats-boutique", id],
    queryFn: () => statsService.getGlobal({ boutiqueId: id }),
    enabled: !!id,
  });

  const ca: number = stats?.stats?._sum?.prixVente ?? 0;
  const nbVentes: number = stats?.stats?._count ?? 0;
  const commissions: number = stats?.totalCommissions ?? 0;
  const netBoutique = ca - commissions;

  return (
    <div>
      <button type="button" className={styles.backBtn} onClick={() => navigate("/")}>
        ‹ Tableau de bord
      </button>

      <h2>{nom}</h2>
      <p className={styles.subtitle}>Fiche boutique</p>

      <h3 className={styles.sectionTitle}>Statistiques</h3>
      {isLoading ? (
        <p className={styles.notice}>Chargement…</p>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatMontant(ca)}</div>
            <div className={styles.statLabel}>Chiffre d'affaires</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{nbVentes}</div>
            <div className={styles.statLabel}>Ventes</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatMontant(commissions)}</div>
            <div className={styles.statLabel}>Commissions créatrices</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatMontant(netBoutique)}</div>
            <div className={styles.statLabel}>Net boutique</div>
          </div>
        </div>
      )}

      <h3 className={styles.sectionTitle}>Exporter les stats</h3>
      <RapportExportButtons scope="boutique" boutiqueId={id} filenameBase={`boutique-${nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} />

      <h3 className={styles.sectionTitle}>Ventes des créatrices</h3>
      <VentesExportButtons boutiqueId={id} filenameBase={`ventes-${nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} />
    </div>
  );
}
