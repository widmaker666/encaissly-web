import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boutiqueService, evenementService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import type { Boutique, Vente } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import VentesExportButtons from "@/components/VentesExportButtons";
import styles from "./Dashboard.module.css";

interface BoutiqueAvecStats {
  id: string;
  nom: string;
  nbCreatrices: number;
  ca: number;
}

interface EvenementAvecVentes {
  id: string;
  nom: string;
  dateDebut: string;
  ventes?: { prixVente: number }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const gerante = isGerante(user, duoMode);
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";

  const [creatingBoutique, setCreatingBoutique] = useState(false);
  const [nomBoutique, setNomBoutique] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: boutiques } = useQuery<BoutiqueAvecStats[]>({
    queryKey: ["boutiques"],
    queryFn: boutiqueService.getAvecStats,
    enabled: gerante,
  });

  const { data: recentVentes } = useQuery<Vente[]>({
    queryKey: ["ventes-recent", "personal", currentMode],
    queryFn: () => venteService.getRecent(undefined, currentMode),
  });

  const { mutate: creerBoutique, isPending: creatingPending } = useMutation({
    mutationFn: () => boutiqueService.creerMaBoutique(nomBoutique.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boutiques"] });
      setCreatingBoutique(false);
      setNomBoutique("");
    },
    onError: (err) => setError(getErrorMessage(err, "Impossible de créer la boutique.")),
  });

  function handleCreerBoutique(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nomBoutique.trim()) return;
    creerBoutique();
  }

  const nomAffiche = user?.prenom || user?.nom ? `${user?.prenom ?? ""} ${user?.nom ?? ""}`.trim() : "Bonjour";
  const liste = boutiques ?? [];

  const { data: mesEvenements, isLoading: loadingEvenements } = useQuery<EvenementAvecVentes[]>({
    queryKey: ["evenements-recap"],
    queryFn: () => evenementService.getAll(),
    enabled: !gerante,
  });

  const { data: mesBoutiquesMembre } = useQuery<Boutique[]>({
    queryKey: ["mes-boutiques"],
    queryFn: () => boutiqueService.getMesBoutiques(),
    enabled: !gerante,
  });

  if (!gerante) {
    const evenements = mesEvenements ?? [];
    const boutiquesMembre = mesBoutiquesMembre ?? [];

    return (
      <div>
        <h2>Bonjour {nomAffiche}</h2>
        {isDuo(user) && <DuoModeToggle />}

        <div className={styles.howCard}>
          <p className={styles.howTitle}>Comment vendre ?</p>
          <div className={styles.howStep}>
            <span className={styles.howBullet}>1</span>
            <span>Active un de tes événements ci-dessous</span>
          </div>
          <div className={styles.howStep}>
            <span className={styles.howBullet}>2</span>
            <span>
              Va dans <b>Ventes</b> et clique sur <b>+ Ajouter une vente</b>
            </span>
          </div>
          <div className={styles.howStep}>
            <span className={styles.howBullet}>3</span>
            <span>Choisis tes articles et le mode de paiement</span>
          </div>
        </div>

        <h3 className={styles.sectionTitle}>Mes événements ({evenements.length})</h3>
        {loadingEvenements ? (
          <p className={styles.notice}>Chargement…</p>
        ) : evenements.length === 0 ? (
          <p className={styles.notice}>
            Aucun événement — crée-en un depuis ton <a href="/profil">profil</a> pour pouvoir vendre.
          </p>
        ) : (
          <div className={styles.boutiquesGrid}>
            {evenements.map((e) => {
              const ca = (e.ventes ?? []).reduce((acc, v) => acc + v.prixVente, 0);
              const nb = e.ventes?.length ?? 0;
              return (
                <button
                  key={e.id}
                  type="button"
                  className={styles.boutiqueCard}
                  onClick={() => navigate(`/evenements/${e.id}?nom=${encodeURIComponent(e.nom)}`)}
                >
                  <div className={styles.boutiqueNom}>{e.nom}</div>
                  <div className={styles.boutiqueMeta}>
                    {formatDate(e.dateDebut)} · {nb} vente{nb > 1 ? "s" : ""} · {formatMontant(ca)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {boutiquesMembre.length > 0 && (
          <>
            <h3 className={styles.sectionTitle}>Mes boutiques ({boutiquesMembre.length})</h3>
            <div className={styles.boutiquesGrid}>
              {boutiquesMembre.map((b) => (
                <div key={b.id} className={styles.boutiqueCardStatic}>
                  <div className={styles.boutiqueNom}>{b.nom}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className={styles.sectionTitle}>Dernières ventes</h3>
        {recentVentes && recentVentes.length > 0 ? (
          <div className={styles.ventesList}>
            {recentVentes.map((v) => (
              <div key={v.id} className={styles.venteRow}>
                <div>
                  <div className={styles.venteNom}>{v.nomArticle}</div>
                  <div className={styles.venteMeta}>{v.modePaiement}</div>
                </div>
                <div className={styles.ventePrix}>{formatMontant(v.prixVente)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.notice}>Aucune vente pour l'instant.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2>Bonjour {nomAffiche}</h2>
      <p className={styles.subtitle}>
        {user?.role} · {user?.plan}
      </p>
      {isDuo(user) && <DuoModeToggle />}

      <h3 className={styles.sectionTitle}>Mes boutiques</h3>
      {liste.length === 0 ? (
        <div className={styles.emptyCard}>
          {!creatingBoutique ? (
            <>
              <p>Tu n'as pas encore de boutique.</p>
              <button type="button" className={styles.primaryBtn} onClick={() => setCreatingBoutique(true)}>
                Créer ma première boutique
              </button>
            </>
          ) : (
            <form onSubmit={handleCreerBoutique} className={styles.boutiqueForm}>
              <input
                className={styles.input}
                value={nomBoutique}
                onChange={(e) => setNomBoutique(e.target.value)}
                placeholder="Ex. : Atelier Lumière"
                autoFocus
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.formRow}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setCreatingBoutique(false);
                    setNomBoutique("");
                    setError(null);
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.primaryBtn} disabled={!nomBoutique.trim() || creatingPending}>
                  {creatingPending ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className={styles.boutiquesGrid}>
          {liste.map((b) => (
            <button
              key={b.id}
              type="button"
              className={styles.boutiqueCard}
              onClick={() => navigate(`/boutiques/${b.id}?nom=${encodeURIComponent(b.nom)}`)}
            >
              <div className={styles.boutiqueNom}>{b.nom}</div>
              <div className={styles.boutiqueMeta}>
                {b.nbCreatrices} créatrice{b.nbCreatrices !== 1 ? "s" : ""} · {formatMontant(b.ca)}
              </div>
            </button>
          ))}
        </div>
      )}

      {liste.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>Récupérer les ventes de la boutique</h3>
          <VentesExportButtons filenameBase="ventes-boutique" />
        </>
      )}

      <h3 className={styles.sectionTitle}>Dernières ventes</h3>
      {recentVentes && recentVentes.length > 0 ? (
        <div className={styles.ventesList}>
          {recentVentes.map((v) => (
            <div key={v.id} className={styles.venteRow}>
              <div>
                <div className={styles.venteNom}>{v.nomArticle}</div>
                <div className={styles.venteMeta}>
                  {v.creatrice?.nom ?? "—"} · {v.modePaiement}
                </div>
              </div>
              <div className={styles.ventePrix}>{formatMontant(v.prixVente)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.notice}>Aucune vente pour l'instant.</p>
      )}
    </div>
  );
}
