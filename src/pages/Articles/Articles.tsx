import { useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { articleService } from "@/services/api";
import { formatMontant } from "@/lib/money";
import { getErrorMessage } from "@/lib/errors";
import type { Article } from "@/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import ArticleFormModal from "./ArticleFormModal";
import styles from "./Articles.module.css";

const ACCEPTED_EXT = ["csv", "xlsx", "xls"];

export default function Articles() {
  const { id: creatriceId = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nomCreatrice = searchParams.get("nom");
  const importInputRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [toDelete, setToDelete] = useState<Article | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["articles", creatriceId],
    queryFn: () => articleService.getAll({ creatriceId }),
    enabled: !!creatriceId,
  });

  const { mutate: supprimer, isPending: deleting } = useMutation({
    mutationFn: (id: string) => articleService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles", creatriceId] });
      setToDelete(null);
    },
    onError: (err) => setImportError(getErrorMessage(err, "Impossible de supprimer l'article.")),
  });

  const { mutate: importer, isPending: importing } = useMutation({
    mutationFn: (file: File) => articleService.importFile(file, { creatriceId }),
    onSuccess: (res) => {
      setImportMessage(res.message);
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: ["articles", creatriceId] });
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

  return (
    <div>
      <button type="button" className={styles.backBtn} onClick={() => navigate(`/creatrices/${creatriceId}`)}>
        ‹ Fiche créatrice
      </button>

      <div className={styles.header}>
        <div>
          <h2>Articles</h2>
          {nomCreatrice && <p className={styles.subtitle}>{nomCreatrice}</p>}
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.importBtn} onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? "Import…" : "📥 Importer"}
          </button>
          <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className={styles.hiddenInput} onChange={handleImportChange} />
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Nouvel article
          </button>
        </div>
      </div>

      {importMessage && <p className={styles.successBanner}>✓ {importMessage}</p>}
      {importError && <p className={styles.errorBanner}>{importError}</p>}

      {isLoading ? (
        <p className={styles.notice}>Chargement…</p>
      ) : articles.length === 0 ? (
        <p className={styles.notice}>Aucun article pour l'instant.</p>
      ) : (
        <div className={styles.grid}>
          {articles.map((article) => (
            <div key={article.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.nom}>{article.nom}</span>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => {
                      setEditing(article);
                      setFormOpen(true);
                    }}
                    aria-label="Modifier"
                  >
                    ✎
                  </button>
                  <button type="button" className={styles.iconBtnDanger} onClick={() => setToDelete(article)} aria-label="Supprimer">
                    ×
                  </button>
                </div>
              </div>
              {article.description && <p className={styles.description}>{article.description}</p>}
              <div className={styles.cardBottom}>
                {article.prixIndicatif != null && <span className={styles.prixBadge}>{formatMontant(article.prixIndicatif)}</span>}
                {article.quantite != null && <span className={styles.stock}>Stock : {article.quantite}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <ArticleFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        creatriceId={creatriceId}
        article={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cet article"
        message={`Supprimer "${toDelete?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        pending={deleting}
        onConfirm={() => toDelete && supprimer(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
