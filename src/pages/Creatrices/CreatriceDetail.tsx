import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creatriceService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isPro as checkIsPro } from "@/lib/access";
import { getErrorMessage } from "@/lib/errors";
import { formatMontant } from "@/lib/money";
import { formatDateLong } from "@/lib/date";
import type { CreatriceDetail as CreatriceDetailType, ModePaiement, VenteDetail } from "@/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import Button from "@/components/Button";
import { CardButton } from "@/components/Card";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import PeriodePicker, { formatPeriode } from "@/components/PeriodePicker";
import Table, { type Column } from "@/components/Table";
import CreatriceFormModal from "./CreatriceFormModal";
import InviteModal from "./InviteModal";
import { MODE_LABEL } from "@/lib/paiement";
import styles from "./CreatriceDetail.module.css";

// Regroupe les lignes identiques (même article, même mode de paiement) —
// une vente de quantité 3 arrive en base comme 1 ligne avec `quantite: 3`,
// mais plusieurs achats séparés du même article arrivent en plusieurs
// lignes : on les fusionne pour l'affichage, comme sur mobile.
function groupVentes(ventes: VenteDetail[]) {
  const map = new Map<string, VenteDetail & { quantite: number }>();
  for (const v of ventes) {
    const key = `${v.nomArticle}-${v.modePaiement}`;
    const existing = map.get(key);
    const qte = (v as unknown as { quantite?: number }).quantite ?? 1;
    if (existing) {
      existing.quantite += qte;
      existing.prixVente += v.prixVente;
    } else {
      map.set(key, { ...v, quantite: qte });
    }
  }
  return Array.from(map.values());
}

const paiementColor: Record<ModePaiement, "info" | "warning"> = {
  CARTE: "info",
  ESPECES: "warning",
};

export default function CreatriceDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Période affichée (stats + ventes) : null = tous les mois, sinon "YYYY-MM" — PRO/DUO
  const pro = checkIsPro(useAuthStore((s) => s.user));
  const [mois, setMois] = useState<string | null>(null);

  const { data: creatrice, isLoading } = useQuery<CreatriceDetailType>({
    queryKey: ["creatrice", id, mois],
    queryFn: () => creatriceService.getOne(id, mois ?? undefined),
    enabled: !!id,
    // Garde la fiche affichée pendant le chargement d'un autre mois (sinon la page clignote)
    placeholderData: keepPreviousData,
  });

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => creatriceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatrices"] });
      navigate("/creatrices");
    },
    onError: (err) => alert(getErrorMessage(err, "Impossible de supprimer la créatrice.")),
  });

  if (isLoading) return <Notice>Chargement…</Notice>;
  if (!creatrice) return <Notice>Créatrice introuvable.</Notice>;

  const initiales = creatrice.nom.substring(0, 2).toUpperCase();

  const columns: Column<VenteDetail & { quantite: number }>[] = [
    {
      key: "article",
      header: "Article",
      render: (v) => `${v.nomArticle}${v.quantite > 1 ? ` × ${v.quantite}` : ""}`,
    },
    { key: "date", header: "Date", render: (v) => formatDateLong(v.createdAt) },
    { key: "prix", header: "Prix", render: (v) => formatMontant(v.prixVente) },
    {
      key: "mode",
      header: "Paiement",
      render: (v) => <Badge color={paiementColor[v.modePaiement]}>{MODE_LABEL[v.modePaiement]}</Badge>,
    },
  ];

  return (
    <div className={styles.page}>
      <Button variant="link" onClick={() => navigate("/creatrices")}>
        ‹ Toutes les créatrices
      </Button>

      <div className={styles.header}>
        <Avatar name={creatrice.nom} initials={initiales} size="lg" color="var(--color-primary-light)" />
        <div className={styles.identity}>
          <h1 className={styles.nom}>{creatrice.nom}</h1>
          <Badge color="neutral">{creatrice.tauxDeCommission}% de commission</Badge>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            Modifier
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setInviteOpen(true)}>
            Inviter
          </Button>
          <Button variant="dangerOutline" size="sm" onClick={() => setConfirmDelete(true)}>
            Supprimer
          </Button>
        </div>
      </div>

      {pro && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Période</h2>
          <PeriodePicker value={mois} onChange={setMois} />
        </section>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(creatrice.stats.ca)}</div>
          <div className={styles.statLabel}>Chiffre d'affaires</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{creatrice.stats.nbVentes}</div>
          <div className={styles.statLabel}>Ventes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(creatrice.stats.totalCommission)}</div>
          <div className={styles.statLabel}>Commission totale</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(creatrice.stats.netCreatrice)}</div>
          <div className={styles.statLabel}>Net créatrice</div>
        </div>
      </div>

      <CardButton
        padding="sm"
        style={{ maxWidth: 420 }}
        onClick={() => navigate(`/creatrices/${creatrice.id}/articles?nom=${encodeURIComponent(creatrice.nom)}`)}
      >
        <span className={styles.catalogueLink}>Voir les articles ›</span>
      </CardButton>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Documents</h2>
        <Button variant="secondary" onClick={() => navigate(`/documents?creatriceId=${creatrice.id}`)} style={{ alignSelf: "flex-start" }}>
          Récupérer ses ventes (PDF, Excel, CSV) →
        </Button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Ventes ({creatrice.ventes.length}){mois ? ` — ${formatPeriode(mois)}` : ""}</h2>
        {creatrice.ventes.length === 0 ? (
          <Notice>{mois ? `Aucune vente en ${formatPeriode(mois)}.` : "Aucune vente enregistrée."}</Notice>
        ) : (
          <Table columns={columns} rows={groupVentes(creatrice.ventes)} rowKey={(v) => v.id} />
        )}
      </section>

      <CreatriceFormModal open={editOpen} onClose={() => setEditOpen(false)} creatrice={creatrice} />

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} creatriceId={creatrice.id} />

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette créatrice"
        message={`Supprimer ${creatrice.nom} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        pending={deleting}
        onConfirm={() => remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
