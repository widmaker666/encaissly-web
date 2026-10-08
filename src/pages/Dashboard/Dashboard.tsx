import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boutiqueService, statsService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { formatMonthYear } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import type { ModePaiement, Vente } from "@/types";
import { MODE_LABEL } from "@/lib/paiement";
import KpiCards from "@/components/KpiCards";
import Card, { CardButton } from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import Avatar from "@/components/Avatar";
import Table, { type Column } from "@/components/Table";
import { InputField } from "@/components/Field";
import VenteCreateModal from "@/pages/Ventes/VenteCreateModal";
import styles from "./Dashboard.module.css";

interface BoutiqueAvecStats {
  id: string;
  nom: string;
  nbCreatrices: number;
  ca: number;
}

interface ParCreatriceRow {
  nbVentes: number;
}

const paiementColor: Record<ModePaiement, "info" | "warning"> = {
  CARTE: "info",
  ESPECES: "warning",
};

function venteColumns(showCreatrice: boolean): Column<Vente>[] {
  const cols: Column<Vente>[] = [{ key: "article", header: "Article", render: (v) => v.nomArticle }];
  if (showCreatrice) {
    cols.push({ key: "creatrice", header: "Créatrice", render: (v) => v.creatrice?.nom ?? "—" });
  }
  cols.push(
    {
      key: "mode",
      header: "Paiement",
      render: (v) => <Badge color={paiementColor[v.modePaiement]}>{MODE_LABEL[v.modePaiement]}</Badge>,
    },
    { key: "prix", header: "Prix", align: "right", render: (v) => formatMontant(v.prixVente) },
  );
  return cols;
}

/** "2026-10" — le mois en cours, au format attendu par l'API stats. */
function moisCourant() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const activeEvenementId = useAuthStore((s) => s.activeEvenementId);
  const activeEvenementNom = useAuthStore((s) => s.activeEvenementNom);
  const gerante = isGerante(user, duoMode);
  const currentMode: "GERANTE" | "CREATRICE" = gerante ? "GERANTE" : "CREATRICE";
  const mois = moisCourant();

  const [venteOpen, setVenteOpen] = useState(false);
  const [creatingBoutique, setCreatingBoutique] = useState(false);
  const [nomBoutique, setNomBoutique] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Une créatrice ne peut vendre que dans un événement actif ; une gérante toujours
  const canSell = gerante || !!activeEvenementId;

  const { data: boutiques } = useQuery<BoutiqueAvecStats[]>({
    queryKey: ["boutiques"],
    queryFn: boutiqueService.getAvecStats,
    enabled: gerante,
  });

  const { data: recentVentes } = useQuery<Vente[]>({
    queryKey: ["ventes-recent", "personal", currentMode],
    queryFn: () => venteService.getRecent(undefined, currentMode),
  });

  // Chiffres du mois en cours (FREE : le serveur impose déjà le mois en cours)
  const { data: statsMois } = useQuery({
    queryKey: ["stats-global", `accueil:${currentMode}:${mois}`],
    queryFn: () => statsService.getGlobal({ mode: currentMode, mois }),
  });

  const { data: parCreatrice } = useQuery<ParCreatriceRow[]>({
    queryKey: ["stats-par-creatrice", currentMode, mois],
    queryFn: () => statsService.getParCreatrice(currentMode, mois),
    enabled: gerante,
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
  const periode = formatMonthYear();

  const kpis = (
    <KpiCards
      gerante={gerante}
      ca={statsMois?.stats?._sum?.prixVente ?? 0}
      nbVentes={statsMois?.stats?._count ?? 0}
      totalCommissions={statsMois?.totalCommissions ?? 0}
      previousCA={statsMois?.previousPeriodCA ?? 0}
      creatricesActives={(parCreatrice ?? []).filter((c) => c.nbVentes > 0).length}
    />
  );

  const dernieresVentes = (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Dernières ventes</h2>
      {recentVentes && recentVentes.length > 0 ? (
        <>
          <Table rowKey={(v) => v.id} columns={venteColumns(gerante)} rows={recentVentes} />
          <Link to="/ventes" className={styles.moreLink}>
            Voir toutes les ventes ›
          </Link>
        </>
      ) : (
        <Notice>Aucune vente pour l'instant.</Notice>
      )}
    </section>
  );

  const venteModal = <VenteCreateModal open={venteOpen} onClose={() => setVenteOpen(false)} />;

  // ── Vue créatrice
  if (!gerante) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Bonjour {nomAffiche}</h1>
            <p className={styles.subtitle}>{periode}</p>
          </div>
        </div>

        {activeEvenementId ? (
          <div className={styles.banner}>
            <div className={styles.bannerText}>
              <strong>Événement actif : {activeEvenementNom}</strong>
              <span>Les nouvelles ventes sont enregistrées dans cet événement.</span>
            </div>
            <Button variant="secondary" className={styles.bannerSecondary} onClick={() => navigate("/evenements")}>
              Changer
            </Button>
            <Button className={styles.bannerPrimary} onClick={() => setVenteOpen(true)}>
              + Ajouter une vente
            </Button>
          </div>
        ) : (
          <Card className={styles.noEvent}>
            <div className={styles.bannerText}>
              <strong>Aucun événement actif</strong>
              <span>Active ou crée un événement pour pouvoir enregistrer des ventes.</span>
            </div>
            <Button onClick={() => navigate("/evenements")}>Choisir un événement</Button>
          </Card>
        )}

        {kpis}
        {dernieresVentes}
        {venteModal}
      </div>
    );
  }

  // ── Vue gérante
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bonjour {nomAffiche}</h1>
          <p className={styles.subtitle}>
            {periode}
            {liste.length === 1 ? ` · ${liste[0].nom}` : ""}
          </p>
        </div>
        <Button onClick={() => canSell && setVenteOpen(true)} disabled={!canSell}>
          + Ajouter une vente
        </Button>
      </div>

      {kpis}

      <div className={styles.twoCol}>
        {dernieresVentes}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mes boutiques</h2>
          {liste.length === 0 ? (
            <Card className={styles.emptyCard}>
              {!creatingBoutique ? (
                <>
                  <p className={styles.emptyText}>Tu n'as pas encore de boutique.</p>
                  <Button onClick={() => setCreatingBoutique(true)}>Créer ma première boutique</Button>
                </>
              ) : (
                <form onSubmit={handleCreerBoutique} className={styles.form}>
                  <InputField
                    value={nomBoutique}
                    onChange={(e) => setNomBoutique(e.target.value)}
                    placeholder="Ex. : Atelier Lumière"
                    autoFocus
                    error={error ?? undefined}
                  />
                  <div className={styles.formRow}>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setCreatingBoutique(false);
                        setNomBoutique("");
                        setError(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" fullWidth disabled={!nomBoutique.trim() || creatingPending}>
                      {creatingPending ? "Création…" : "Créer"}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          ) : (
            <div className={styles.stack}>
              {liste.map((b) => (
                <CardButton key={b.id} onClick={() => navigate(`/boutiques/${b.id}?nom=${encodeURIComponent(b.nom)}`)}>
                  <div className={styles.cardRow}>
                    <Avatar name={b.nom} size="sm" />
                    <div>
                      <div className={styles.cardTitle}>{b.nom}</div>
                      <div className={styles.cardMeta}>
                        {b.nbCreatrices} créatrice{b.nbCreatrices !== 1 ? "s" : ""} · {formatMontant(b.ca)} au total
                      </div>
                    </div>
                  </div>
                </CardButton>
              ))}
            </div>
          )}
        </section>
      </div>

      {venteModal}
    </div>
  );
}
