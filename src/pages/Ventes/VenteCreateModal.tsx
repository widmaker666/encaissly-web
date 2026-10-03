import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { articleService, creatriceService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { getErrorMessage } from "@/lib/errors";
import type { Article, Creatrice, ModePaiement } from "@/types";
import Modal from "@/components/Modal";
import styles from "./VenteCreateModal.module.css";

// Sur mobile c'est un assistant en 3 étapes (créatrice → articles → récap),
// nécessaire sur un petit écran. Sur PC il y a la place de tout montrer d'un
// coup : on choisit la créatrice, ses articles apparaissent juste en dessous,
// on clique pour les ajouter — pensé pour aller vite au clavier/souris.

interface Selection {
  key: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
  articleId?: string;
}

const INVALIDATE_KEYS = [
  "ventes",
  "articles",
  "stats",
  "stats-global",
  "stats-top-articles",
  "stats-historique",
  "stats-par-creatrice",
  "ventes-recent",
];

export default function VenteCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const activeEvenementId = useAuthStore((s) => s.activeEvenementId);
  const gerante = isGerante(user, duoMode);

  const [creatriceId, setCreatriceId] = useState<string>("");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [modePaiement, setModePaiement] = useState<ModePaiement>("ESPECES");
  const [sansCommission, setSansCommission] = useState(false);
  const [manuelNom, setManuelNom] = useState("");
  const [manuelPrix, setManuelPrix] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setCreatriceId("");
    setSelections([]);
    setModePaiement("ESPECES");
    setSansCommission(false);
    setManuelNom("");
    setManuelPrix("");
    setError(null);
  }

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const { data: creatrices } = useQuery({
    queryKey: ["creatrices"],
    queryFn: creatriceService.getAll,
    enabled: open,
  });

  // Auto-sélection si une seule fiche (cas fréquent côté créatrice).
  useEffect(() => {
    if (!gerante && creatrices?.length === 1 && !creatriceId) {
      setCreatriceId(creatrices[0].id);
    }
  }, [creatrices, gerante, creatriceId]);

  const { data: articles, isLoading: loadingArticles } = useQuery({
    queryKey: ["articles", activeEvenementId ?? creatriceId],
    queryFn: () =>
      activeEvenementId
        ? articleService.getAll({ evenementId: activeEvenementId })
        : articleService.getAll({ creatriceId }),
    enabled: !!creatriceId,
  });

  const selectedArticleIds = new Set(selections.map((s) => s.articleId).filter(Boolean));

  function toggleArticle(article: Article) {
    setSelections((prev) => {
      if (prev.some((s) => s.articleId === article.id)) {
        return prev.filter((s) => s.articleId !== article.id);
      }
      return [
        ...prev,
        {
          key: article.id,
          nom: article.nom,
          prixUnitaire: article.prixIndicatif ?? 0,
          quantite: 1,
          articleId: article.id,
        },
      ];
    });
  }

  function setQty(key: string, delta: number) {
    setSelections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, quantite: Math.max(1, s.quantite + delta) } : s)),
    );
  }

  function addManuel() {
    const nom = manuelNom.trim();
    const prix = parseFloat(manuelPrix.replace(",", "."));
    if (!nom || isNaN(prix) || prix <= 0) return;
    setSelections((prev) => [...prev, { key: `manuel-${Date.now()}`, nom, prixUnitaire: prix, quantite: 1 }]);
    setManuelNom("");
    setManuelPrix("");
  }

  function handleManuelKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addManuel();
    }
  }

  function removeSelection(key: string) {
    setSelections((prev) => prev.filter((s) => s.key !== key));
  }

  const total = selections.reduce((acc, s) => acc + s.prixUnitaire * s.quantite, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!creatriceId || selections.length === 0 || pending) return;
    setError(null);
    setPending(true);
    try {
      await Promise.all(
        selections.map((s) =>
          venteService.create({
            nomArticle: s.nom,
            prixVente: s.prixUnitaire * s.quantite,
            modePaiement,
            creatriceId,
            articleId: s.articleId,
            quantite: s.quantite,
            evenementId: activeEvenementId ?? undefined,
            sansCommission,
          }),
        ),
      );
      INVALIDATE_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors de l'enregistrement. Réessaye."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle vente" maxWidth={640}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="creatrice">
          Créatrice
        </label>
        <select
          id="creatrice"
          className={styles.select}
          value={creatriceId}
          onChange={(e) => {
            setCreatriceId(e.target.value);
            setSelections([]);
          }}
          disabled={!gerante && (creatrices?.length ?? 0) <= 1}
          required
        >
          <option value="" disabled>
            Choisir…
          </option>
          {creatrices?.map((c: Creatrice) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>

        {creatriceId && (
          <>
            <div className={styles.sectionTitle}>Articles</div>
            {loadingArticles ? (
              <p className={styles.hint}>Chargement…</p>
            ) : articles && articles.length > 0 ? (
              <div className={styles.articleGrid}>
                {articles.map((a: Article) => {
                  const selected = selectedArticleIds.has(a.id);
                  const sel = selections.find((s) => s.articleId === a.id);
                  return (
                    <div
                      key={a.id}
                      className={selected ? `${styles.articleRow} ${styles.articleRowSelected}` : styles.articleRow}
                    >
                      <button type="button" className={styles.articleMain} onClick={() => toggleArticle(a)}>
                        <span className={styles.checkbox}>{selected && "✓"}</span>
                        <span className={styles.articleNom}>{a.nom}</span>
                        {a.prixIndicatif != null && <span className={styles.articlePrix}>{formatMontant(a.prixIndicatif)}</span>}
                      </button>
                      {selected && sel && (
                        <div className={styles.qtyRow}>
                          <button type="button" className={styles.qtyBtn} onClick={() => setQty(sel.key, -1)}>
                            −
                          </button>
                          <span>{sel.quantite}</span>
                          <button type="button" className={styles.qtyBtn} onClick={() => setQty(sel.key, 1)}>
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.hint}>Aucun article pour cette créatrice — utilise "article non répertorié" ci-dessous.</p>
            )}

            <div className={styles.manuelRow}>
              <input
                className={styles.input}
                placeholder="Article non répertorié"
                value={manuelNom}
                onChange={(e) => setManuelNom(e.target.value)}
                onKeyDown={handleManuelKeyDown}
              />
              <input
                className={styles.inputPrix}
                placeholder="Prix €"
                inputMode="decimal"
                value={manuelPrix}
                onChange={(e) => setManuelPrix(e.target.value)}
                onKeyDown={handleManuelKeyDown}
              />
              <button type="button" className={styles.addBtn} onClick={addManuel}>
                Ajouter
              </button>
            </div>

            {selections.filter((s) => !s.articleId).length > 0 && (
              <ul className={styles.manuelList}>
                {selections
                  .filter((s) => !s.articleId)
                  .map((s) => (
                    <li key={s.key} className={styles.manuelItem}>
                      {s.nom} — {formatMontant(s.prixUnitaire)}
                      <button type="button" className={styles.removeBtn} onClick={() => removeSelection(s.key)}>
                        ×
                      </button>
                    </li>
                  ))}
              </ul>
            )}

            <div className={styles.paymentRow}>
              <div className={styles.modeGroup}>
                {(["ESPECES", "CARTE"] as ModePaiement[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={modePaiement === m ? `${styles.modeChip} ${styles.modeChipActive}` : styles.modeChip}
                    onClick={() => {
                      setModePaiement(m);
                      if (m !== "ESPECES") setSansCommission(false);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {modePaiement === "ESPECES" && (
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={sansCommission} onChange={(e) => setSansCommission(e.target.checked)} />
                  Pas de commission sur cette vente
                </label>
              )}
            </div>

            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>{formatMontant(total)}</strong>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={selections.length === 0 || pending}>
              {pending ? "Enregistrement…" : "Enregistrer les ventes"}
            </button>
          </>
        )}
      </form>
    </Modal>
  );
}
