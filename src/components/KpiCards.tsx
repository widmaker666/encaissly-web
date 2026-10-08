import { formatMontant } from "@/lib/money";
import Card from "@/components/Card";
import styles from "./KpiCards.module.css";

interface KpiCardsProps {
  gerante: boolean;
  /** Chiffre d'affaires de la période */
  ca: number;
  nbVentes: number;
  /** Commissions reçues par la gérante (= ce que la créatrice reverse) */
  totalCommissions: number;
  /** CA de la période précédente, pour l'évolution (0 = pas de comparaison) */
  previousCA?: number;
  /** Nombre de créatrices ayant vendu (vue gérante) */
  creatricesActives?: number;
}

/** Les 4 chiffres clés d'une période — mêmes calculs sur l'Accueil et les Stats. */
export default function KpiCards({ gerante, ca, nbVentes, totalCommissions, previousCA = 0, creatricesActives = 0 }: KpiCardsProps) {
  const ticketMoyen = nbVentes > 0 ? ca / nbVentes : 0;
  const net = ca - totalCommissions;
  const evolution = previousCA > 0 ? ((ca - previousCA) / previousCA) * 100 : null;

  return (
    <div className={styles.grid}>
      <Card padding="sm">
        <div className={styles.label}>{gerante ? "CA boutique" : "Chiffre d'affaires"}</div>
        <div className={styles.value}>{formatMontant(ca)}</div>
        {evolution !== null && (
          <div className={evolution >= 0 ? styles.up : styles.down}>
            {evolution >= 0 ? "▲ +" : "▼ "}
            {evolution.toFixed(1)}%
          </div>
        )}
      </Card>
      <Card padding="sm">
        <div className={styles.label}>{gerante ? "Créatrices actives" : "Ventes"}</div>
        <div className={styles.value}>{gerante ? creatricesActives : nbVentes}</div>
      </Card>
      <Card padding="sm">
        <div className={styles.label}>{gerante ? "Commissions reçues" : "Net à percevoir"}</div>
        <div className={styles.valueGreen}>{formatMontant(gerante ? totalCommissions : net)}</div>
      </Card>
      <Card padding="sm">
        <div className={styles.label}>Ticket moyen</div>
        <div className={styles.value}>{formatMontant(ticketMoyen)}</div>
      </Card>
    </div>
  );
}
