import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { boutiqueService, evenementService, statsService } from "@/services/api";
import type { StatsParams } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante, isPro as checkIsPro } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import DuoModeToggle from "@/components/DuoModeToggle";
import VentesExportButtons from "@/components/VentesExportButtons";
import RapportExportButtons from "@/components/RapportExportButtons";
import styles from "./Stats.module.css";

// Port de encaissly-mobile/pages/Stats/index.tsx — même données, même
// calculs (évolution vs période précédente, ticket moyen...), mise en page
// adaptée au PC (grille 4 colonnes au lieu de 2, barres pleine largeur).

type Filter = { type: "all" } | { type: "event"; id: string; nom: string } | { type: "boutique"; id: string; nom: string };

interface Boutique {
  id: string;
  nom: string;
}
interface Evenement {
  id: string;
  nom: string;
}
interface ParCreatriceRow {
  id: string;
  nom: string;
  ca: number;
  commissions: number;
  net: number;
  nbVentes: number;
}
interface HistoriqueRow {
  mois: string;
  ca: number;
}
interface TopArticleRow {
  nomArticle: string;
  ca: number;
  quantite?: number;
  nbVentes?: number;
}

export default function Stats() {
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const gerante = isGerante(user, duoMode);
  const creatrice = !gerante;
  const pro = checkIsPro(user);
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";

  const [filter, setFilter] = useState<Filter>({ type: "all" });

  const { data: mesEvenements } = useQuery<Evenement[]>({
    queryKey: ["mes-evenements-stats"],
    queryFn: () => evenementService.getAll(),
    enabled: creatrice,
  });

  const { data: mesBoutiques } = useQuery<Boutique[]>({
    queryKey: ["mes-boutiques-stats"],
    queryFn: boutiqueService.getMesBoutiques,
    enabled: gerante,
  });

  const statsParams: StatsParams =
    filter.type === "event"
      ? { evenementId: filter.id, mode: currentMode }
      : filter.type === "boutique"
        ? { boutiqueId: filter.id, mode: currentMode }
        : { mode: currentMode };

  const filterKey = (filter.type === "all" ? "all" : `${filter.type}:${filter.id}`) + `:${currentMode}`;

  const { data: globalData } = useQuery({
    queryKey: ["stats-global", filterKey],
    queryFn: () => statsService.getGlobal(statsParams),
  });

  const { data: historiqueData } = useQuery<HistoriqueRow[]>({
    queryKey: ["stats-historique", filterKey],
    queryFn: () => statsService.getHistorique(statsParams),
    enabled: pro,
  });

  const { data: topArticlesData } = useQuery<TopArticleRow[]>({
    queryKey: ["stats-top-articles", filterKey],
    queryFn: () => statsService.getTopArticles(statsParams),
  });

  const { data: parCreatriceData } = useQuery<ParCreatriceRow[]>({
    queryKey: ["stats-par-creatrice", currentMode],
    queryFn: () => statsService.getParCreatrice(currentMode),
    enabled: gerante,
  });

  const paiements: { modePaiement: string; _sum?: { prixVente?: number } }[] = globalData?.paiement ?? [];
  const especesMontant = paiements.find((p) => p.modePaiement === "ESPECES")?._sum?.prixVente ?? 0;
  const carteMontant = paiements.find((p) => p.modePaiement === "CARTE")?._sum?.prixVente ?? 0;
  const paiementsTotal = especesMontant + carteMontant;

  const currentCA: number = globalData?.stats?._sum?.prixVente ?? 0;
  const nbVentes: number = globalData?.stats?._count ?? 0;
  const totalCommissions: number = globalData?.totalCommissions ?? 0;
  const ticketMoyen = nbVentes > 0 ? currentCA / nbVentes : 0;
  const netCreatrice = currentCA - totalCommissions;
  const creatricesActives = (parCreatriceData ?? []).filter((c) => c.nbVentes > 0).length;

  const previousCA: number = globalData?.previousPeriodCA ?? 0;
  const evolution = previousCA > 0 ? ((currentCA - previousCA) / previousCA) * 100 : null;

  const historique = historiqueData ?? [];
  const caMax = historique.reduce((max, item) => (item.ca > max ? item.ca : max), 0);

  const topArticles = topArticlesData ?? [];
  const caMaxArticle = topArticles.reduce((max, a) => (a.ca > max ? a.ca : max), 0);

  const parCreatrice = parCreatriceData ?? [];

  const hasPills = (mesBoutiques && mesBoutiques.length > 0) || (mesEvenements && mesEvenements.length > 0);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2>Stats</h2>
          <p className={styles.subtitle}>
            {filter.type !== "all" ? `${filter.type === "event" ? "🎪" : "🏪"} ${filter.nom}` : pro ? "3 derniers mois" : "Mois en cours"}
          </p>
          {isDuo(user) && <DuoModeToggle />}
        </div>
      </div>

      {hasPills && (
        <div className={styles.pills}>
          <button type="button" className={filter.type === "all" ? `${styles.pill} ${styles.pillActive}` : styles.pill} onClick={() => setFilter({ type: "all" })}>
            Tout
          </button>
          {mesBoutiques?.map((b) => (
            <button
              key={b.id}
              type="button"
              className={filter.type === "boutique" && filter.id === b.id ? `${styles.pill} ${styles.pillActive}` : styles.pill}
              onClick={() => setFilter({ type: "boutique", id: b.id, nom: b.nom })}
            >
              🏪 {b.nom}
            </button>
          ))}
          {mesEvenements?.map((e) => (
            <button
              key={e.id}
              type="button"
              className={filter.type === "event" && filter.id === e.id ? `${styles.pill} ${styles.pillActive}` : styles.pill}
              onClick={() => setFilter({ type: "event", id: e.id, nom: e.nom })}
            >
              🎪 {e.nom}
            </button>
          ))}
        </div>
      )}

      <h3 className={styles.sectionTitle}>Résumé</h3>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{gerante ? "CA boutique" : "Chiffre d'affaires"}</div>
          <div className={styles.kpiValue}>{formatMontant(currentCA)}</div>
          {evolution !== null && (
            <div className={evolution >= 0 ? styles.evolutionUp : styles.evolutionDown}>
              {evolution >= 0 ? "▲ +" : "▼ "}
              {evolution.toFixed(1)}%
            </div>
          )}
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{gerante ? "Créatrices actives" : "Ventes"}</div>
          <div className={styles.kpiValue}>{gerante ? creatricesActives : nbVentes}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{gerante ? "Commissions reçues" : "Net à percevoir"}</div>
          <div className={styles.kpiValueGreen}>{formatMontant(gerante ? totalCommissions : netCreatrice)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Ticket moyen</div>
          <div className={styles.kpiValue}>{formatMontant(ticketMoyen)}</div>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Répartition paiements</h3>
      <div className={styles.card}>
        {[
          { label: "💵 Espèces", montant: especesMontant },
          { label: "💳 Carte", montant: carteMontant },
        ].map((item) => {
          const pct = paiementsTotal > 0 ? (item.montant / paiementsTotal) * 100 : 0;
          return (
            <div key={item.label} className={styles.barRow}>
              <div className={styles.barLabelRow}>
                <span>{item.label}</span>
                <span className={styles.barMontant}>{formatMontant(item.montant)}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} title={`${pct.toFixed(0)}%`} />
              </div>
            </div>
          );
        })}
      </div>

      <h3 className={styles.sectionTitle}>Historique mensuel</h3>
      {!pro ? (
        <div className={styles.lockedBox}>
          <p className={styles.lockedTitle}>Historique disponible en PRO</p>
          <p className={styles.lockedDesc}>Accède aux 3 derniers mois de chiffre d'affaires avec le plan PRO.</p>
        </div>
      ) : historique.length > 0 ? (
        <div className={styles.card}>
          <div className={styles.chart}>
            {historique.map((item) => {
              const height = caMax > 0 ? (item.ca / caMax) * 140 : 4;
              const label = item.mois.split(" ")[0].slice(0, 3);
              return (
                <div key={item.mois} className={styles.chartCol}>
                  <span className={styles.chartValue}>{formatMontant(item.ca)}</span>
                  <div className={styles.chartBar} style={{ height: Math.max(height, 4) }} title={formatMontant(item.ca)} />
                  <span className={styles.chartLabel}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className={styles.notice}>Aucune donnée disponible.</p>
      )}

      <h3 className={styles.sectionTitle}>Top articles</h3>
      {topArticles.length === 0 ? (
        <p className={styles.notice}>Aucun article vendu.</p>
      ) : (
        <div className={styles.card}>
          {topArticles.map((article, i) => {
            const pct = caMaxArticle > 0 ? (article.ca / caMaxArticle) * 100 : 0;
            return (
              <div key={article.nomArticle ?? i} className={styles.barRow}>
                <div className={styles.barLabelRow}>
                  <span>{article.nomArticle}</span>
                  <span className={styles.barMontant}>{formatMontant(article.ca)}</span>
                </div>
                <div className={styles.articleMeta}>{article.quantite ?? article.nbVentes} vendu(s)</div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} title={`${pct.toFixed(0)}%`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gerante && (
        <>
          <h3 className={styles.sectionTitle}>Par créatrice</h3>
          {parCreatrice.length === 0 ? (
            <p className={styles.notice}>Aucune donnée créatrice.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>CA</th>
                  <th>Commission</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {parCreatrice.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.tableNom}>{c.nom}</td>
                    <td>{formatMontant(c.ca)}</td>
                    <td>{formatMontant(c.commissions)}</td>
                    <td className={styles.tableNet}>{formatMontant(c.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <h3 className={styles.sectionTitle}>Téléchargements</h3>
      <RapportExportButtons scope={gerante ? "boutique" : "personal"} filenameBase={gerante ? "rapport-boutique" : "rapport"} />

      {gerante && (
        <>
          <h3 className={styles.sectionTitle}>Ventes des créatrices</h3>
          <VentesExportButtons filenameBase="ventes-boutique" />
        </>
      )}
    </div>
  );
}
