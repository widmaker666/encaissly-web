import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { boutiqueService, evenementService, statsService } from "@/services/api";
import type { StatsParams } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante, isPro as checkIsPro } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import DuoModeToggle from "@/components/DuoModeToggle";
import VentesExportButtons from "@/components/VentesExportButtons";
import RapportExportButtons from "@/components/RapportExportButtons";
import Card from "@/components/Card";
import Chip from "@/components/Chip";
import Notice from "@/components/Notice";
import Table, { type Column } from "@/components/Table";
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

const parCreatriceColumns: Column<ParCreatriceRow>[] = [
  { key: "nom", header: "Nom", render: (c) => c.nom },
  { key: "ca", header: "CA", align: "right", render: (c) => formatMontant(c.ca) },
  { key: "commissions", header: "Commission", align: "right", render: (c) => formatMontant(c.commissions) },
  { key: "net", header: "Net", align: "right", render: (c) => <span className={styles.tableNet}>{formatMontant(c.net)}</span> },
];

export default function Stats() {
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const gerante = isGerante(user, duoMode);
  const creatrice = !gerante;
  const pro = checkIsPro(user);
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";

  const [filter, setFilter] = useState<Filter>({ type: "all" });

  // La bascule DUO ne démonte pas la page : react-query garde en cache les
  // événements (créatrice) ou boutiques (gérante) vus juste avant, même une
  // fois `enabled` repassé à false. Sans ce reset, basculer gérante -> créatrice
  // -> gérante laissait le filtre sur un événement qui n'a plus de sens côté
  // gérante (repéré en test réel : pill 🎪 visible alors que "Gérante" est sélectionné).
  useEffect(() => {
    setFilter({ type: "all" });
  }, [gerante]);

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

  // Ne jamais afficher les boutiques en vue créatrice ni les événements en
  // vue gérante, même si react-query a encore l'autre en cache (voir le
  // useEffect plus haut) — le rôle actuel prime toujours sur les données.
  const boutiquesAffichees = gerante ? (mesBoutiques ?? []) : [];
  const evenementsAffiches = creatrice ? (mesEvenements ?? []) : [];
  const hasPills = boutiquesAffichees.length > 0 || evenementsAffiches.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Stats</h1>
        <p className={styles.subtitle}>
          {filter.type !== "all" ? `${filter.type === "event" ? "🎪" : "🏪"} ${filter.nom}` : pro ? "3 derniers mois" : "Mois en cours"}
        </p>
        {isDuo(user) && <DuoModeToggle />}
      </div>

      {hasPills && (
        <div className={styles.pills}>
          <Chip active={filter.type === "all"} onClick={() => setFilter({ type: "all" })}>
            Tout
          </Chip>
          {boutiquesAffichees.map((b) => (
            <Chip
              key={b.id}
              active={filter.type === "boutique" && filter.id === b.id}
              onClick={() => setFilter({ type: "boutique", id: b.id, nom: b.nom })}
            >
              🏪 {b.nom}
            </Chip>
          ))}
          {evenementsAffiches.map((e) => (
            <Chip
              key={e.id}
              active={filter.type === "event" && filter.id === e.id}
              onClick={() => setFilter({ type: "event", id: e.id, nom: e.nom })}
            >
              🎪 {e.nom}
            </Chip>
          ))}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Résumé</h2>
        <div className={styles.kpiGrid}>
          <Card padding="sm">
            <div className={styles.kpiLabel}>{gerante ? "CA boutique" : "Chiffre d'affaires"}</div>
            <div className={styles.kpiValue}>{formatMontant(currentCA)}</div>
            {evolution !== null && (
              <div className={evolution >= 0 ? styles.evolutionUp : styles.evolutionDown}>
                {evolution >= 0 ? "▲ +" : "▼ "}
                {evolution.toFixed(1)}%
              </div>
            )}
          </Card>
          <Card padding="sm">
            <div className={styles.kpiLabel}>{gerante ? "Créatrices actives" : "Ventes"}</div>
            <div className={styles.kpiValue}>{gerante ? creatricesActives : nbVentes}</div>
          </Card>
          <Card padding="sm">
            <div className={styles.kpiLabel}>{gerante ? "Commissions reçues" : "Net à percevoir"}</div>
            <div className={styles.kpiValueGreen}>{formatMontant(gerante ? totalCommissions : netCreatrice)}</div>
          </Card>
          <Card padding="sm">
            <div className={styles.kpiLabel}>Ticket moyen</div>
            <div className={styles.kpiValue}>{formatMontant(ticketMoyen)}</div>
          </Card>
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Répartition paiements</h2>
          <Card className={styles.barCard}>
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
          </Card>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Historique mensuel</h2>
          {!pro ? (
            <Card className={styles.lockedBox}>
              <p className={styles.lockedTitle}>Historique disponible en PRO</p>
              <p className={styles.lockedDesc}>Accède aux 3 derniers mois de chiffre d'affaires avec le plan PRO.</p>
            </Card>
          ) : historique.length > 0 ? (
            <Card className={styles.barCard}>
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
            </Card>
          ) : (
            <Notice>Aucune donnée disponible.</Notice>
          )}
        </section>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Top articles</h2>
        {topArticles.length === 0 ? (
          <Notice>Aucun article vendu.</Notice>
        ) : (
          <Card className={styles.barCard}>
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
          </Card>
        )}
      </section>

      {gerante && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Par créatrice</h2>
          {parCreatrice.length === 0 ? (
            <Notice>Aucune donnée créatrice.</Notice>
          ) : (
            <Table columns={parCreatriceColumns} rows={parCreatrice} rowKey={(c) => c.id} />
          )}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Téléchargements</h2>
        <RapportExportButtons scope={gerante ? "boutique" : "personal"} filenameBase={gerante ? "rapport-boutique" : "rapport"} />
      </section>

      {gerante && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ventes des créatrices</h2>
          <VentesExportButtons filenameBase="ventes-boutique" />
        </section>
      )}
    </div>
  );
}
