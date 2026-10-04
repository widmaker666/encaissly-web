import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router";
import { creatriceService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante, FREE_LIMITS } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import type { Creatrice } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import CreatriceFormModal from "./CreatriceFormModal";
import styles from "./Creatrices.module.css";

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
    <div>
      <div className={styles.header}>
        <div>
          <h2>Créatrices</h2>
          <p className={styles.subtitle}>
            {count} créatrice{count > 1 ? "s" : ""} · {user?.plan ?? "FREE"}
          </p>
          {isDuo(user) && <DuoModeToggle />}
        </div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => !atFreeLimit && setCreateOpen(true)}
          disabled={atFreeLimit}
          title={atFreeLimit ? `Plan FREE limité à ${FREE_LIMITS.maxCreatrices} créatrices` : undefined}
        >
          + Nouvelle créatrice
        </button>
      </div>

      <input
        className={styles.search}
        placeholder="Rechercher une créatrice…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <p className={styles.notice}>Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className={styles.notice}>{search ? "Aucune créatrice trouvée." : "Aucune créatrice pour l'instant."}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Contact</th>
              <th>Commission</th>
              <th>Ventes</th>
              <th>CA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={styles.row} onClick={() => navigate(`/creatrices/${c.id}`)}>
                <td className={styles.nomCell}>{c.nom}</td>
                <td>{c.email ?? c.telephone ?? "—"}</td>
                <td>{c.tauxDeCommission}%</td>
                <td>{c.nbVentes ?? 0}</td>
                <td>{formatMontant(c.ca)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {atFreeLimit && (
        <p className={styles.notice}>
          🔒 Plan FREE limité à {FREE_LIMITS.maxCreatrices} créatrices — passe à PRO pour en ajouter davantage.
        </p>
      )}

      <CreatriceFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
