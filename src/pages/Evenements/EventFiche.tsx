import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { articleService, evenementService, statsService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import type { Article, ModePaiement, Vente } from "@/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import ArticleFormModal from "@/pages/Articles/ArticleFormModal";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Banner from "@/components/Banner";
import Notice from "@/components/Notice";
import Table, { type Column } from "@/components/Table";
import styles from "./EventFiche.module.css";

// Port de encaissly-mobile/pages/Creatrice/EventFiche.tsx — la fiche d'un
// événement (marché, foire) côté créatrice : stats, articles/stock,
// dernières ventes. Sur mobile c'est un sous-écran du Dashboard (pas de
// vraie route) ; sur le web ça devient une page à part entière
// (/evenements/:id) — l'événement actif est adressable dans l'URL,
// contrairement au mobile où il ne vit qu'en mémoire (perdu au redémarrage).

const ACCEPTED_EXT = ["csv", "xlsx", "xls"];

const paiementColor: Record<ModePaiement, "info" | "warning"> = {
  CARTE: "info",
  ESPECES: "warning",
};

export default function EventFiche() {
  const { id: evenementId = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveEvenement = useAuthStore((s) => s.setActiveEvenement);
  const activeEvenementId = useAuthStore((s) => s.activeEvenementId);

  const nomEvenement = searchParams.get("nom") ?? "Événement";
  const importInputRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Article | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [deleteEventError, setDeleteEventError] = useState<string | null>(null);

  // Rend cet événement "actif" app-wide (Ventes, Stats... en dépendent) dès
  // qu'on arrive sur sa fiche — y compris en arrivant directement par l'URL.
  useEffect(() => {
    if (evenementId && activeEvenementId !== evenementId) {
      setActiveEvenement(evenementId, nomEvenement);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evenementId]);

  const articlesKey = ["articles-event", evenementId];

  const { data: articles = [], isLoading: loadingArticles } = useQuery<Article[]>({
    queryKey: articlesKey,
    queryFn: () => articleService.getAll({ evenementId }),
    enabled: !!evenementId,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", evenementId],
    // mode: "CREATRICE" toujours ici, même si le compte est DUO et affiche
    // "Gérante" ailleurs — cette fiche est intrinsèquement la vue perso de la
    // créatrice. Sans ça, le backend résout un compte GERANTE_CREATRICE comme
    // gérante par défaut et renvoie les stats de SA BOUTIQUE au lieu de
    // celles de l'événement (repéré en test réel : mêmes chiffres que la
    // fiche boutique réelle, alors que l'événement était vide).
    queryFn: () => statsService.getGlobal({ evenementId, mode: "CREATRICE" }),
    enabled: !!evenementId,
  });

  const { data: ventesRes } = useQuery({
    queryKey: ["ventes", "fiche", evenementId],
    queryFn: () => venteService.getAll({ evenementId, mode: "CREATRICE" }),
    enabled: !!evenementId,
  });
  const recentVentes: Vente[] = ventesRes?.data ?? [];

  const { mutate: removeArticle, isPending: deleting } = useMutation({
    mutationFn: (id: string) => articleService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articlesKey });
      setToDelete(null);
    },
    onError: (err) => setImportError(getErrorMessage(err, "Impossible de supprimer l'article.")),
  });

  const { mutate: importer, isPending: importing } = useMutation({
    mutationFn: (file: File) => articleService.importFile(file, { evenementId }),
    onSuccess: (res) => {
      setImportMessage(res.message);
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: articlesKey });
    },
    onError: (err) => {
      setImportError(getErrorMessage(err, "Impossible d'importer le fichier."));
      setImportMessage(null);
    },
  });

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ACCEPTED_EXT.includes(ext)) {
      setImportError("Format invalide — seuls les fichiers CSV et Excel (.xlsx, .xls) sont acceptés.");
      return;
    }
    importer(file);
  }

  function handleQuitter() {
    setActiveEvenement(null, null);
    navigate("/profil");
  }

  const { mutate: removeEvenement, isPending: deletingEvent } = useMutation({
    mutationFn: () => evenementService.remove(evenementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mes-evenements"] });
      setActiveEvenement(null, null);
      navigate("/profil");
    },
    onError: (err) => {
      setDeleteEventError(getErrorMessage(err, "Impossible de supprimer l'événement."));
      setConfirmDeleteEvent(false);
    },
  });

  const ca: number = stats?.stats?._sum?.prixVente ?? 0;
  const nbVentes: number = stats?.stats?._count ?? 0;
  const commissions: number = stats?.totalCommissions ?? 0;

  const articleColumns: Column<Article>[] = [
    { key: "nom", header: "Article", render: (a) => a.nom },
    {
      key: "meta",
      header: "Prix / Stock",
      render: (a) => `${a.prixIndicatif != null ? formatMontant(a.prixIndicatif) : "Prix libre"}${a.quantite != null ? ` · Qté : ${a.quantite}` : ""}`,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <Button variant="icon" style={{ color: "var(--color-error)" }} onClick={() => setToDelete(a)} aria-label="Supprimer">
          ✕
        </Button>
      ),
    },
  ];

  const venteColumns: Column<Vente>[] = [
    { key: "article", header: "Article", render: (v) => `${v.nomArticle}${(v.quantite ?? 1) > 1 ? ` × ${v.quantite}` : ""}` },
    { key: "date", header: "Date", render: (v) => formatDate(v.createdAt) },
    { key: "mode", header: "Mode", render: (v) => <Badge color={paiementColor[v.modePaiement]}>{v.modePaiement}</Badge> },
    { key: "prix", header: "Prix", align: "right", render: (v) => formatMontant(v.prixVente) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{nomEvenement}</h1>
          <p className={styles.subtitle}>Ma fiche événement</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" size="sm" onClick={handleQuitter}>
            Quitter cet événement
          </Button>
          <Button variant="dangerOutline" size="sm" onClick={() => setConfirmDeleteEvent(true)}>
            Supprimer cet événement
          </Button>
        </div>
      </div>

      {deleteEventError && <Banner variant="error">{deleteEventError}</Banner>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Statistiques</h2>
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
            <div className={styles.statLabel}>Commission</div>
          </Card>
          <Card padding="sm">
            <div className={styles.statValue}>{formatMontant(ca - commissions)}</div>
            <div className={styles.statLabel}>Net créatrice</div>
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionRow}>
          <h2 className={styles.sectionTitle}>Articles ({articles.length})</h2>
          <div className={styles.sectionActions}>
            <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()} disabled={importing}>
              {importing ? "Import…" : "⬆ Importer"}
            </Button>
            <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className={styles.hiddenInput} onChange={handleImportChange} />
            <Button size="sm" onClick={() => setFormOpen(true)}>
              + Ajouter
            </Button>
          </div>
        </div>

        {importMessage && <Banner variant="success">✓ {importMessage}</Banner>}
        {importError && <Banner variant="error">{importError}</Banner>}

        {loadingArticles ? (
          <Notice>Chargement…</Notice>
        ) : articles.length === 0 ? (
          <Notice>Aucun article pour cet événement — ajoute-en ou importe un CSV/Excel.</Notice>
        ) : (
          <Table columns={articleColumns} rows={articles} rowKey={(a) => a.id} />
        )}
      </section>

      {recentVentes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dernières ventes</h2>
          <Table columns={venteColumns} rows={recentVentes.slice(0, 10)} rowKey={(v) => v.id} />
        </section>
      )}

      <ArticleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        scope={{ evenementId }}
        invalidateKey={articlesKey}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cet article"
        message={`Supprimer "${toDelete?.nom}" ?`}
        confirmLabel="Supprimer"
        danger
        pending={deleting}
        onConfirm={() => toDelete && removeArticle(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />

      {/* Suppression de l'événement — avertissement explicite : la base
          supprime ses ventes ET ses articles en cascade, ce n'est pas juste
          "l'événement devient inaccessible". */}
      <ConfirmDialog
        open={confirmDeleteEvent}
        title="Supprimer cet événement"
        message={
          nbVentes > 0
            ? `Cet événement contient ${nbVentes} vente${nbVentes > 1 ? "s" : ""} pour ${formatMontant(ca)}. Les supprimer définitivement, avec tous les articles de cet événement ? Cette action est irréversible.`
            : `Supprimer "${nomEvenement}" et tous ses articles ? Cette action est irréversible.`
        }
        confirmLabel="Supprimer définitivement"
        danger
        pending={deletingEvent}
        onConfirm={() => removeEvenement()}
        onCancel={() => setConfirmDeleteEvent(false)}
      />
    </div>
  );
}
