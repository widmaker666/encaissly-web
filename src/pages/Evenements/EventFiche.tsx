import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { articleService, statsService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import type { Article, Vente } from "@/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import ArticleFormModal from "@/pages/Articles/ArticleFormModal";
import styles from "./EventFiche.module.css";

// Port de encaissly-mobile/pages/Creatrice/EventFiche.tsx — la fiche d'un
// événement (marché, foire) côté créatrice : stats, articles/stock,
// dernières ventes. Sur mobile c'est un sous-écran du Dashboard (pas de
// vraie route) ; sur le web ça devient une page à part entière
// (/evenements/:id) — l'événement actif est adressable dans l'URL,
// contrairement au mobile où il ne vit qu'en mémoire (perdu au redémarrage).

const ACCEPTED_EXT = ["csv", "xlsx", "xls"];

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
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    queryFn: () => statsService.getGlobal({ evenementId }),
    enabled: !!evenementId,
  });

  const { data: recentVentes = [] } = useQuery<Vente[]>({
    queryKey: ["ventes", "fiche", evenementId],
    queryFn: () => venteService.getAll({ evenementId }),
    enabled: !!evenementId,
  });

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

  const ca: number = stats?.stats?._sum?.prixVente ?? 0;
  const nbVentes: number = stats?.stats?._count ?? 0;
  const commissions: number = stats?.totalCommissions ?? 0;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2>{nomEvenement}</h2>
          <p className={styles.subtitle}>Ma fiche événement</p>
        </div>
        <button type="button" className={styles.quitterBtn} onClick={handleQuitter}>
          Quitter cet événement
        </button>
      </div>

      <h3 className={styles.sectionTitle}>Statistiques</h3>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(ca)}</div>
          <div className={styles.statLabel}>Chiffre d'affaires</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{nbVentes}</div>
          <div className={styles.statLabel}>Ventes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(commissions)}</div>
          <div className={styles.statLabel}>Commission</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatMontant(ca - commissions)}</div>
          <div className={styles.statLabel}>Net créatrice</div>
        </div>
      </div>

      <div className={styles.sectionRow}>
        <h3 className={styles.sectionTitle}>Articles ({articles.length})</h3>
        <div className={styles.sectionActions}>
          <button type="button" className={styles.actionBtn} onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? "Import…" : "⬆ Importer"}
          </button>
          <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className={styles.hiddenInput} onChange={handleImportChange} />
          <button type="button" className={styles.actionBtnPrimary} onClick={() => setFormOpen(true)}>
            + Ajouter
          </button>
        </div>
      </div>

      {importMessage && <p className={styles.successBanner}>✓ {importMessage}</p>}
      {importError && <p className={styles.errorBanner}>{importError}</p>}

      {loadingArticles ? (
        <p className={styles.notice}>Chargement…</p>
      ) : articles.length === 0 ? (
        <p className={styles.notice}>Aucun article pour cet événement — ajoute-en ou importe un CSV/Excel.</p>
      ) : (
        <div className={styles.articleList}>
          {articles.map((a) => (
            <div key={a.id} className={styles.articleRow}>
              <div>
                <div className={styles.articleNom}>{a.nom}</div>
                <div className={styles.articleMeta}>
                  {a.prixIndicatif != null ? formatMontant(a.prixIndicatif) : "Prix libre"}
                  {a.quantite != null ? ` · Qté : ${a.quantite}` : ""}
                </div>
              </div>
              <button type="button" className={styles.deleteBtn} onClick={() => setToDelete(a)} aria-label="Supprimer">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {recentVentes.length > 0 && (
        <>
          <h3 className={styles.sectionTitle} style={{ marginTop: 20 }}>
            Dernières ventes
          </h3>
          <div className={styles.articleList}>
            {recentVentes.slice(0, 10).map((v) => (
              <div key={v.id} className={styles.articleRow}>
                <div>
                  <div className={styles.articleNom}>
                    {v.nomArticle}
                    {(v.quantite ?? 1) > 1 ? ` × ${v.quantite}` : ""}
                  </div>
                  <div className={styles.articleMeta}>
                    {formatDate(v.createdAt)} · {v.modePaiement}
                  </div>
                </div>
                <span className={styles.ventePrix}>{formatMontant(v.prixVente)}</span>
              </div>
            ))}
          </div>
        </>
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
    </div>
  );
}
