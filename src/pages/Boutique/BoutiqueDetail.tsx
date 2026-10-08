import { useParams, useSearchParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/api";
import { formatMontant } from "@/lib/money";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Notice from "@/components/Notice";
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
    <div className={styles.page}>
      <Button variant="link" onClick={() => navigate("/")}>
        ‹ Tableau de bord
      </Button>

      <div>
        <h1 className={styles.title}>{nom}</h1>
        <p className={styles.subtitle}>Fiche boutique</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Statistiques</h2>
        {isLoading ? (
          <Notice>Chargement…</Notice>
        ) : (
          <div className={styles.statsGrid}>
            <Card padding="sm">
              <div className={styles.statValue}>{formatMontant(ca)}</div>
              <div className={styles.statLabel}>Chiffre d'affaires</div>
            </Card>
            <Card padding="sm">
              <div className={styles.statValue}>{nbVentes}</div>
              <div className={styles.statLabel}>Ventes</div>
            </Card>
            <Card padding="sm">
              <div className={styles.statValue}>{formatMontant(commissions)}</div>
              <div className={styles.statLabel}>Commissions créatrices</div>
            </Card>
            <Card padding="sm">
              <div className={styles.statValue}>{formatMontant(netBoutique)}</div>
              <div className={styles.statLabel}>Net boutique</div>
            </Card>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Documents</h2>
        <Button variant="secondary" onClick={() => navigate("/documents")} style={{ alignSelf: "flex-start" }}>
          Exporter les ventes et le récapitulatif →
        </Button>
      </section>
    </div>
  );
}
