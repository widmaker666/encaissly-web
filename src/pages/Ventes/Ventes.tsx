import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import type { ModePaiement, Vente } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import VenteCreateModal from "./VenteCreateModal";
import VenteEditModal from "./VenteEditModal";
import styles from "./Ventes.module.css";

type FilterMode = "TOUT" | ModePaiement;
type SortKey = "article" | "prix" | "mode" | "date";
type SortDir = "asc" | "desc";

export default function Ventes() {
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const activeEvenementId = useAuthStore((s) => s.activeEvenementId);
  const activeEvenementNom = useAuthStore((s) => s.activeEvenementNom);
  const gerante = isGerante(user, duoMode);

  const [filter, setFilter] = useState<FilterMode>("TOUT");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Vente | null>(null);

  const canSell = gerante || !!activeEvenementId;
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";

  const queryFilters = {
    ...(filter !== "TOUT" ? { modePaiement: filter } : {}),
    ...(activeEvenementId ? { evenementId: activeEvenementId } : {}),
    mode: currentMode,
  };

  // currentMode dans la clé : sans ça, la bascule DUO ne redéclenche pas le
  // fetch et affiche la liste de l'autre vue (bug repéré en testant le site).
  const { data: ventes, isLoading } = useQuery<Vente[]>({
    queryKey: ["ventes", filter, activeEvenementId ?? "personal", currentMode],
    queryFn: () => venteService.getAll(queryFilters),
  });

  const sorted = useMemo(() => {
    const list = [...(ventes ?? [])];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.key) {
        case "article":
          return a.nomArticle.localeCompare(b.nomArticle) * dir;
        case "prix":
          return (a.prixVente - b.prixVente) * dir;
        case "mode":
          return a.modePaiement.localeCompare(b.modePaiement) * dir;
        case "date":
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return list;
  }, [ventes, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  function sortIndicator(key: SortKey) {
    if (sort.key !== key) return "";
    return sort.dir === "asc" ? " ↑" : " ↓";
  }

  const count = ventes?.length ?? 0;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2>Ventes</h2>
          <p className={styles.subtitle}>
            {activeEvenementNom ? `🎪 ${activeEvenementNom}` : `${count} vente${count > 1 ? "s" : ""} · ${user?.plan ?? "FREE"}`}
          </p>
          {isDuo(user) && <DuoModeToggle />}
        </div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => canSell && setCreateOpen(true)}
          disabled={!canSell}
          title={canSell ? undefined : "Active un événement pour pouvoir vendre"}
        >
          + Ajouter une vente
        </button>
      </div>

      {!canSell && (
        <p className={styles.notice}>
          Aucun événement actif — crée ou ouvre un événement depuis ton <Link to="/profil">profil</Link>, puis reviens ici pour vendre.
        </p>
      )}

      <div className={styles.filters}>
        {(["TOUT", "ESPECES", "CARTE"] as FilterMode[]).map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className={styles.notice}>Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className={styles.notice}>
          {filter !== "TOUT" ? `Aucune vente en ${filter}` : "Aucune vente pour l'instant."}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => toggleSort("article")}>Article{sortIndicator("article")}</th>
              <th>Créatrice / événement</th>
              <th onClick={() => toggleSort("prix")}>Prix{sortIndicator("prix")}</th>
              <th onClick={() => toggleSort("mode")}>Paiement{sortIndicator("mode")}</th>
              <th onClick={() => toggleSort("date")}>Date{sortIndicator("date")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => (
              <tr key={v.id} className={styles.row} onClick={() => setEditing(v)}>
                <td>
                  {v.nomArticle}
                  {(v.quantite ?? 1) > 1 ? ` × ${v.quantite}` : ""}
                </td>
                <td>{v.evenement?.nom ?? v.creatrice?.nom ?? "—"}</td>
                <td>{formatMontant(v.prixVente)}</td>
                <td>
                  <span className={v.modePaiement === "ESPECES" ? styles.badgeEspeces : styles.badgeCarte}>
                    {v.modePaiement}
                  </span>
                </td>
                <td>{formatDate(v.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <VenteCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <VenteEditModal vente={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
