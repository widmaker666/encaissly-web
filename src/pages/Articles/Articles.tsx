import { useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { articleService } from "@/services/api";
import { formatMontant } from "@/lib/money";
import { getErrorMessage } from "@/lib/errors";
import type { Article } from "@/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Banner from "@/components/Banner";
import Notice from "@/components/Notice";
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
    <div className={styles.page}>
      <Button variant="link" onClick={() => navigate(`/creatrices/${creatriceId}`)}>
        ‹ Fiche créatrice
      </Button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Articles</h1>
          {nomCreatrice && <p className={styles.subtitle}>{nomCreatrice}</p>}
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? "Import…" : "📥 Importer"}
          </Button>
          <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className={styles.hiddenInput} onChange={handleImportChange} />
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Nouvel article
          </Button>
        </div>
      </div>

      {importMessage && <Banner variant="success">✓ {importMessage}</Banner>}
      {importError && <Banner variant="error">{importError}</Banner>}

      {isLoading ? (
        <Notice>Chargement…</Notice>
      ) : articles.length === 0 ? (
        <Notice>Aucun article pour l'instant.</Notice>
      ) : (
        <div className={styles.grid}>
          {articles.map((article) => (
            <Card key={article.id} padding="sm">
              <div className={styles.cardTop}>
                <span className={styles.nom}>{article.nom}</span>
                <div className={styles.cardActions}>
                  <Button
                    variant="icon"
                    onClick={() => {
                      setEditing(article);
                      setFormOpen(true);
                    }}
                    aria-label="Modifier"
                  >
                    ✎
                  </Button>
                  <Button variant="icon" style={{ color: "var(--color-error)" }} onClick={() => setToDelete(article)} aria-label="Supprimer">
                    ×
                  </Button>
                </div>
              </div>
              {article.description && <p className={styles.description}>{article.description}</p>}
              <div className={styles.cardBottom}>
                {article.prixIndicatif != null && <Badge color="primary">{formatMontant(article.prixIndicatif)}</Badge>}
                {article.quantite != null && <span className={styles.stock}>Stock : {article.quantite}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ArticleFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        scope={{ creatriceId }}
        invalidateKey={["articles", creatriceId]}
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
