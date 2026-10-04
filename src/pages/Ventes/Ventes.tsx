import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { creatriceService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import type { Creatrice, ModePaiement, Vente } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import Table, { type Column } from "@/components/Table";
import { fieldControl } from "@/components/Field";
import VenteCreateModal from "./VenteCreateModal";
import VenteEditModal from "./VenteEditModal";
import styles from "./Ventes.module.css";

type FilterMode = "TOUT" | ModePaiement;

const PAGE_SIZE = 20;
const MOIS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Les 12 derniers mois, le plus récent en premier — mois précis uniquement,
 * pas de plage libre (même logique que les exports existants). */
function moisOptions() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({ value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

function moisToRange(mois: string): { dateDebut: string; dateFin: string } {
  const [y, m] = mois.split("-").map(Number);
  const debut = new Date(y, m - 1, 1, 0, 0, 0);
  const fin = new Date(y, m, 0, 23, 59, 59);
  return { dateDebut: debut.toISOString(), dateFin: fin.toISOString() };
}

const paiementColor: Record<ModePaiement, "info" | "warning"> = {
  CARTE: "info",
  ESPECES: "warning",
};

const columns: Column<Vente>[] = [
  {
    key: "article",
    header: "Article",
    render: (v) => `${v.nomArticle}${(v.quantite ?? 1) > 1 ? ` × ${v.quantite}` : ""}`,
    sortValue: (v) => v.nomArticle,
  },
  { key: "qui", header: "Créatrice / événement", render: (v) => v.evenement?.nom ?? v.creatrice?.nom ?? "—" },
  { key: "prix", header: "Prix", render: (v) => formatMontant(v.prixVente), sortValue: (v) => v.prixVente },
  {
    key: "mode",
    header: "Paiement",
    render: (v) => <Badge color={paiementColor[v.modePaiement]}>{v.modePaiement}</Badge>,
    sortValue: (v) => v.modePaiement,
  },
  { key: "date", header: "Date", render: (v) => formatDate(v.createdAt), sortValue: (v) => new Date(v.createdAt).getTime() },
];

export default function Ventes() {
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const activeEvenementId = useAuthStore((s) => s.activeEvenementId);
  const activeEvenementNom = useAuthStore((s) => s.activeEvenementNom);
  const gerante = isGerante(user, duoMode);

  const [filter, setFilter] = useState<FilterMode>("TOUT");
  const [creatriceId, setCreatriceId] = useState<string>("");
  const [mois, setMois] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Vente | null>(null);

  const canSell = gerante || !!activeEvenementId;
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";

  // Filtre créatrice : uniquement côté gérante (une créatrice voit déjà
  // uniquement les siennes — pas la peine de se filtrer elle-même).
  const { data: creatrices } = useQuery<Creatrice[]>({
    queryKey: ["creatrices"],
    queryFn: creatriceService.getAll,
    enabled: gerante,
  });

  const dateRange = mois ? moisToRange(mois) : {};

  const queryFilters = {
    ...(filter !== "TOUT" ? { modePaiement: filter } : {}),
    ...(activeEvenementId ? { evenementId: activeEvenementId } : {}),
    ...(gerante && creatriceId ? { creatriceId } : {}),
    ...dateRange,
    mode: currentMode,
  };

  // currentMode dans la clé : sans ça, la bascule DUO ne redéclenche pas le
  // fetch et affiche la liste de l'autre vue (bug repéré en testant le site).
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["ventes", filter, creatriceId, mois, activeEvenementId ?? "personal", currentMode],
    queryFn: ({ pageParam }) => venteService.getAll({ ...queryFilters, skip: pageParam, take: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((acc, p) => acc + p.data.length, 0);
      return lastPage.hasMore ? loaded : undefined;
    },
  });

  const ventes = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ventes</h1>
          <p className={styles.subtitle}>
            {activeEvenementNom ? `🎪 ${activeEvenementNom}` : `${total} vente${total > 1 ? "s" : ""} · ${user?.plan ?? "FREE"}`}
          </p>
          {isDuo(user) && <DuoModeToggle />}
        </div>
        <Button
          onClick={() => canSell && setCreateOpen(true)}
          disabled={!canSell}
          title={canSell ? undefined : "Active un événement pour pouvoir vendre"}
        >
          + Ajouter une vente
        </Button>
      </div>

      {!canSell && (
        <Notice>
          Aucun événement actif — crée ou ouvre un événement depuis ton <Link to="/profil">profil</Link>, puis reviens ici pour vendre.
        </Notice>
      )}

      <div className={styles.filtersRow}>
        <div className={styles.filters}>
          {(["TOUT", "ESPECES", "CARTE"] as FilterMode[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        <select className={fieldControl} style={{ maxWidth: 200 }} value={mois} onChange={(e) => setMois(e.target.value)}>
          <option value="">Tout l'historique</option>
          {moisOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {gerante && (
          <select className={fieldControl} style={{ maxWidth: 220 }} value={creatriceId} onChange={(e) => setCreatriceId(e.target.value)}>
            <option value="">Toutes les créatrices</option>
            {(creatrices ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <Notice>Chargement…</Notice>
      ) : ventes.length === 0 ? (
        <Notice>{filter !== "TOUT" ? `Aucune vente en ${filter}` : "Aucune vente pour l'instant."}</Notice>
      ) : (
        <>
          <Table columns={columns} rows={ventes} rowKey={(v) => v.id} onRowClick={setEditing} sortable />
          {hasNextPage && (
            <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Chargement…" : `Afficher plus (${ventes.length} / ${total})`}
            </Button>
          )}
        </>
      )}

      <VenteCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <VenteEditModal vente={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
