import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boutiqueService, evenementService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isGerante, isPro as checkIsPro } from "@/lib/access";
import { formatDate } from "@/lib/date";
import { formatMontant } from "@/lib/money";
import { getErrorMessage } from "@/lib/errors";
import type { Boutique } from "@/types";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import Notice from "@/components/Notice";
import Banner from "@/components/Banner";
import { InputField } from "@/components/Field";
import VenteCreateModal from "@/pages/Ventes/VenteCreateModal";
import styles from "./Evenements.module.css";

interface EvenementAvecVentes {
  id: string;
  nom: string;
  dateDebut: string;
  ventes?: { prixVente: number }[];
}

/** Vue créatrice : là où elle vend (marchés, salons…). Un seul événement est « actif » à la fois. */
export default function Evenements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const activeEvenementId = useAuthStore((s) => s.activeEvenementId);
  const setActiveEvenement = useAuthStore((s) => s.setActiveEvenement);
  const gerante = isGerante(user, duoMode);
  const pro = checkIsPro(user);

  const [creating, setCreating] = useState(false);
  const [nom, setNom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [venteOpen, setVenteOpen] = useState(false);

  // Page réservée à la vue créatrice : un compte DUO qui bascule en gérante repart à l'accueil
  useEffect(() => {
    if (gerante) navigate("/", { replace: true });
  }, [gerante, navigate]);

  const { data: evenements = [], isLoading } = useQuery<EvenementAvecVentes[]>({
    queryKey: ["mes-evenements"],
    queryFn: () => evenementService.getAll(),
    enabled: !gerante,
  });

  const { data: boutiques = [] } = useQuery<Boutique[]>({
    queryKey: ["mes-boutiques"],
    queryFn: () => boutiqueService.getMesBoutiques(),
    enabled: !gerante,
  });

  // FREE : 1 événement maximum ; PRO/DUO : illimité
  const canCreate = pro || evenements.length < 1;

  const { mutate: creer, isPending } = useMutation({
    mutationFn: () => evenementService.creerMonEvenement(nom.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mes-evenements"] });
      setCreating(false);
      setNom("");
    },
    onError: (err) => setError(getErrorMessage(err, "Impossible de créer l'événement.")),
  });

  function handleCreer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (nom.trim()) creer();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Événements</h1>
          <p className={styles.subtitle}>Là où tu vends : marchés, salons, boutiques partenaires</p>
        </div>
        {canCreate && !creating && <Button onClick={() => setCreating(true)}>+ Nouvel événement</Button>}
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      {creating && (
        <Card>
          <form onSubmit={handleCreer} className={styles.form}>
            <InputField
              label="Nom de l'événement"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Marché de Noël 2026"
              autoFocus
            />
            <div className={styles.formRow}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCreating(false);
                  setNom("");
                  setError(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={!nom.trim() || isPending}>
                {isPending ? "Création…" : "Créer"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!canCreate && <Notice>🔒 Plan FREE : 1 événement maximum. Passe à PRO pour en créer davantage.</Notice>}

      <section className={styles.section}>
        {isLoading ? (
          <Notice>Chargement…</Notice>
        ) : evenements.length === 0 ? (
          <Notice>Aucun événement pour l'instant — crée-en un pour pouvoir enregistrer des ventes.</Notice>
        ) : (
          evenements.map((e) => {
            const actif = e.id === activeEvenementId;
            const nb = e.ventes?.length ?? 0;
            const ca = (e.ventes ?? []).reduce((acc, v) => acc + v.prixVente, 0);
            return (
              <Card key={e.id} className={actif ? `${styles.event} ${styles.eventActive}` : styles.event}>
                <div className={styles.eventInfo}>
                  <div className={styles.eventName}>
                    {e.nom} {actif && <Badge color="success">Actif</Badge>}
                  </div>
                  <div className={styles.eventMeta}>
                    {formatDate(e.dateDebut)} · {nb} vente{nb > 1 ? "s" : ""} · {formatMontant(ca)}
                  </div>
                </div>
                <div className={styles.eventActions}>
                  {actif ? (
                    <Button size="sm" onClick={() => setVenteOpen(true)}>
                      + Vente
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setActiveEvenement(e.id, e.nom)}>
                      Activer
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/evenements/${e.id}?nom=${encodeURIComponent(e.nom)}`)}>
                    Ouvrir
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {boutiques.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mes boutiques partenaires</h2>
          {boutiques.map((b) => (
            <Card key={b.id} className={styles.event}>
              <div className={styles.eventInfo}>
                <div className={styles.boutique}>
                  <Avatar name={b.nom} size="sm" />
                  <div>
                    <div className={styles.eventName}>{b.nom}</div>
                    <div className={styles.eventMeta}>Tu es membre de cette boutique</div>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/mes-ventes/${b.id}?nom=${encodeURIComponent(b.nom)}`)}>
                Voir mes ventes
              </Button>
            </Card>
          ))}
        </section>
      )}

      <VenteCreateModal open={venteOpen} onClose={() => setVenteOpen(false)} />
    </div>
  );
}
