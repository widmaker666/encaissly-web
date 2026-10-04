import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boutiqueService, evenementService, venteService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import { formatMontant } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import type { Boutique, ModePaiement, Vente } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import VentesExportButtons from "@/components/VentesExportButtons";
import Card, { CardButton } from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Notice from "@/components/Notice";
import Avatar from "@/components/Avatar";
import Table, { type Column } from "@/components/Table";
import { InputField } from "@/components/Field";
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

const paiementColor: Record<ModePaiement, "info" | "warning"> = {
  CARTE: "info",
  ESPECES: "warning",
};

function venteColumns(showCreatrice: boolean): Column<Vente>[] {
  const cols: Column<Vente>[] = [
    { key: "article", header: "Article", render: (v) => v.nomArticle },
  ];
  if (showCreatrice) {
    cols.push({ key: "creatrice", header: "Créatrice", render: (v) => v.creatrice?.nom ?? "—" });
  }
  cols.push(
    {
      key: "mode",
      header: "Mode",
      render: (v) => <Badge color={paiementColor[v.modePaiement]}>{v.modePaiement}</Badge>,
    },
    { key: "prix", header: "Prix", align: "right", render: (v) => formatMontant(v.prixVente) },
  );
  return cols;
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
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Bonjour {nomAffiche}</h1>
          {isDuo(user) && <DuoModeToggle />}
        </div>

        <Card className={styles.howCard}>
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
        </Card>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mes événements ({evenements.length})</h2>
          {loadingEvenements ? (
            <Notice>Chargement…</Notice>
          ) : evenements.length === 0 ? (
            <Notice>
              Aucun événement — crée-en un depuis ton <a href="/profil">profil</a> pour pouvoir vendre.
            </Notice>
          ) : (
            <div className={styles.grid}>
              {evenements.map((e) => {
                const ca = (e.ventes ?? []).reduce((acc, v) => acc + v.prixVente, 0);
                const nb = e.ventes?.length ?? 0;
                return (
                  <CardButton
                    key={e.id}
                    onClick={() => navigate(`/evenements/${e.id}?nom=${encodeURIComponent(e.nom)}`)}
                  >
                    <div className={styles.cardTitle}>{e.nom}</div>
                    <div className={styles.cardMeta}>
                      {formatDate(e.dateDebut)} · {nb} vente{nb > 1 ? "s" : ""} · {formatMontant(ca)}
                    </div>
                  </CardButton>
                );
              })}
            </div>
          )}
        </section>

        {boutiquesMembre.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Mes boutiques ({boutiquesMembre.length})</h2>
            <div className={styles.grid}>
              {boutiquesMembre.map((b) => (
                <CardButton key={b.id} onClick={() => navigate(`/mes-ventes/${b.id}?nom=${encodeURIComponent(b.nom)}`)}>
                  <div className={styles.cardRow}>
                    <Avatar name={b.nom} size="sm" />
                    <div>
                      <div className={styles.cardTitle}>{b.nom}</div>
                      <div className={styles.cardMeta}>Voir mes ventes ›</div>
                    </div>
                  </div>
                </CardButton>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dernières ventes</h2>
          {recentVentes && recentVentes.length > 0 ? (
            <Table rowKey={(v) => v.id} columns={venteColumns(false)} rows={recentVentes} />
          ) : (
            <Notice>Aucune vente pour l'instant.</Notice>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{user?.role}</span>
          <h1 className={styles.title}>Bonjour {nomAffiche}</h1>
        </div>
        {isDuo(user) && <DuoModeToggle />}
        {!isDuo(user) && <Badge color={user?.plan === "FREE" ? "neutral" : "success"}>{user?.plan}</Badge>}
      </div>

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
          <div className={styles.grid}>
            {liste.map((b) => (
              <CardButton key={b.id} onClick={() => navigate(`/boutiques/${b.id}?nom=${encodeURIComponent(b.nom)}`)}>
                <div className={styles.cardRow}>
                  <Avatar name={b.nom} size="sm" />
                  <div>
                    <div className={styles.cardTitle}>{b.nom}</div>
                    <div className={styles.cardMeta}>
                      {b.nbCreatrices} créatrice{b.nbCreatrices !== 1 ? "s" : ""} · {formatMontant(b.ca)}
                    </div>
                  </div>
                </div>
              </CardButton>
            ))}
          </div>
        )}
      </section>

      {liste.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Récupérer les ventes de la boutique</h2>
          <VentesExportButtons filenameBase="ventes-boutique" />
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dernières ventes</h2>
        {recentVentes && recentVentes.length > 0 ? (
          <Table rowKey={(v) => v.id} columns={venteColumns(true)} rows={recentVentes} />
        ) : (
          <Notice>Aucune vente pour l'instant.</Notice>
        )}
      </section>
    </div>
  );
}
