import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import type { ModePaiement, Vente } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import Table, { type Column } from "@/components/Table";
import VenteCreateModal from "./VenteCreateModal";
import VenteEditModal from "./VenteEditModal";
import styles from "./Ventes.module.css";

type FilterMode = "TOUT" | ModePaiement;

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

  const count = ventes?.length ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ventes</h1>
          <p className={styles.subtitle}>
            {activeEvenementNom ? `🎪 ${activeEvenementNom}` : `${count} vente${count > 1 ? "s" : ""} · ${user?.plan ?? "FREE"}`}
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

      <div className={styles.filters}>
        {(["TOUT", "ESPECES", "CARTE"] as FilterMode[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <Notice>Chargement…</Notice>
      ) : count === 0 ? (
        <Notice>{filter !== "TOUT" ? `Aucune vente en ${filter}` : "Aucune vente pour l'instant."}</Notice>
      ) : (
        <Table columns={columns} rows={ventes ?? []} rowKey={(v) => v.id} onRowClick={setEditing} sortable />
      )}

      <VenteCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <VenteEditModal vente={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
