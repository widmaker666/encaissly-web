import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router";
import { creatriceService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isGerante, FREE_LIMITS } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import type { Creatrice } from "@/types";
import Button from "@/components/Button";
import Notice from "@/components/Notice";
import Table, { type Column } from "@/components/Table";
import { fieldControl } from "@/components/Field";
import CreatriceFormModal from "./CreatriceFormModal";
import styles from "./Creatrices.module.css";

const columns: Column<Creatrice>[] = [
  { key: "nom", header: "Nom", render: (c) => <span className={styles.nomCell}>{c.nom}</span>, sortValue: (c) => c.nom },
  { key: "contact", header: "Contact", render: (c) => c.email ?? c.telephone ?? "—" },
  { key: "commission", header: "Commission", render: (c) => `${c.tauxDeCommission}%`, sortValue: (c) => c.tauxDeCommission },
  { key: "ventes", header: "Ventes", render: (c) => c.nbVentes ?? 0, sortValue: (c) => c.nbVentes ?? 0 },
  { key: "ca", header: "CA", align: "right", render: (c) => formatMontant(c.ca), sortValue: (c) => c.ca ?? 0 },
];

export default function Creatrices() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const gerante = isGerante(user, duoMode);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: creatrices, isLoading } = useQuery<Creatrice[]>({
    queryKey: ["creatrices"],
    queryFn: creatriceService.getAll,
    enabled: gerante,
  });

  const filtered = useMemo(
    () => (creatrices ?? []).filter((c) => c.nom.toLowerCase().includes(search.toLowerCase())),
    [creatrices, search],
  );

  const count = creatrices?.length ?? 0;
  const atFreeLimit = user?.plan === "FREE" && count >= FREE_LIMITS.maxCreatrices;

  if (!gerante) {
    // Gestion d'autres créatrices n'a pas de sens pour une créatrice — son suivi perso est déjà sur le Dashboard.
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Créatrices</h1>
          <p className={styles.subtitle}>
            {count} créatrice{count > 1 ? "s" : ""} · {user?.plan ?? "FREE"}
          </p>
        </div>
        <Button
          onClick={() => !atFreeLimit && setCreateOpen(true)}
          disabled={atFreeLimit}
          title={atFreeLimit ? `Plan FREE limité à ${FREE_LIMITS.maxCreatrices} créatrices` : undefined}
        >
          + Nouvelle créatrice
        </Button>
      </div>

      <input
        className={fieldControl}
        style={{ maxWidth: 320 }}
        placeholder="Rechercher une créatrice…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <Notice>Chargement…</Notice>
      ) : filtered.length === 0 ? (
        <Notice>{search ? "Aucune créatrice trouvée." : "Aucune créatrice pour l'instant."}</Notice>
      ) : (
        <Table columns={columns} rows={filtered} rowKey={(c) => c.id} onRowClick={(c) => navigate(`/creatrices/${c.id}`)} sortable />
      )}

      {atFreeLimit && (
        <Notice>🔒 Plan FREE limité à {FREE_LIMITS.maxCreatrices} créatrices — passe à PRO pour en ajouter davantage.</Notice>
      )}

      <CreatriceFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
