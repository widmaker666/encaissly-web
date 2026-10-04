import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, boutiqueService, evenementService, stripeService, userService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante, isPro as checkIsPro } from "@/lib/access";
import { formatDateLong } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import type { Boutique } from "@/types";
import DuoModeToggle from "@/components/DuoModeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import Banner from "@/components/Banner";
import Notice from "@/components/Notice";

// Passer à true quand Stripe live sera activé (SIRET en cours)
const PAIEMENT_ACTIF = false;
const PAIEMENT_MSG = "Les abonnements ne sont pas encore disponibles : le site et l'application sont en phase de test. Ça arrive très bientôt !";
import { fieldControl } from "@/components/Field";
import styles from "./Profil.module.css";

interface Evenement {
  id: string;
  nom: string;
  dateDebut: string;
}

type BillingPeriod = "monthly" | "annual";

export default function Profil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const gerante = isGerante(user, duoMode);
  const duo = isDuo(user);
  const isPlanPro = user?.plan === "PRO";
  const isPlanDuo = user?.plan === "DUO";

  const [isEditing, setIsEditing] = useState(false);
  const [editPrenom, setEditPrenom] = useState(user?.prenom ?? "");
  const [editNom, setEditNom] = useState(user?.nom ?? "");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [error, setError] = useState<string | null>(null);
  // Paiement Stripe pas encore ouvert (phase de test) : le bouton affiche un message
  const [paiementInfo, setPaiementInfo] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"none" | "first" | "second">("none");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [nomEvenement, setNomEvenement] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const setActiveEvenement = useAuthStore((s) => s.setActiveEvenement);

  const pro = checkIsPro(user);

  const { data: mesEvenements = [] } = useQuery<Evenement[]>({
    queryKey: ["mes-evenements"],
    queryFn: () => evenementService.getAll(),
    enabled: !gerante,
  });

  const { data: mesBoutiques = [] } = useQuery<Boutique[]>({
    queryKey: ["mes-boutiques"],
    queryFn: () => boutiqueService.getMesBoutiques(),
    enabled: !gerante,
  });

  //- DUO débloque les mêmes fonctionnalités que PRO
  const canCreateEvent = pro || mesEvenements.length < 1;

  const { mutate: creerEvenement, isPending: creatingEventPending } = useMutation({
    mutationFn: () => evenementService.creerMonEvenement(nomEvenement.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mes-evenements"] });
      setCreatingEvent(false);
      setNomEvenement("");
    },
    onError: () => setError("Impossible de créer l'événement."),
  });

  function handleCreerEvenement(e: FormEvent) {
    e.preventDefault();
    if (!nomEvenement.trim()) return;
    creerEvenement();
  }

  function handleOuvrirEvenement(ev: Evenement) {
    setActiveEvenement(ev.id, ev.nom);
    navigate(`/evenements/${ev.id}?nom=${encodeURIComponent(ev.nom)}`);
  }

  const { mutate: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: () => userService.updateProfile({ nom: editNom || undefined, prenom: editPrenom || undefined }),
    onSuccess: (data) => {
      if (user) setUser({ ...user, nom: data.nom, prenom: data.prenom });
      queryClient.invalidateQueries({ queryKey: ["ventes"] });
      queryClient.invalidateQueries({ queryKey: ["ventes-recent"] });
      queryClient.invalidateQueries({ queryKey: ["creatrices"] });
      queryClient.invalidateQueries({ queryKey: ["creatrice"] });
      setIsEditing(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
    onSuccess: (data) => {
      if (user) setUser({ ...user, avatar: data.avatar });
    },
    onError: () => setError("Impossible de mettre à jour l'avatar."),
  });

  const { mutate: toggleNotif, isPending: isTogglingNotif } = useMutation({
    mutationFn: (enabled: boolean) => userService.updateNotifications(enabled),
    onSuccess: (_data, enabled) => {
      if (user) setUser({ ...user, notificationsEmail: enabled });
    },
  });

  const { mutate: cancelPlan, isPending: isCancelling } = useMutation({
    mutationFn: () => stripeService.cancelSubscription(),
    onSuccess: async () => setUser(await authService.getProfile()),
    onError: () => setError("Impossible de résilier l'abonnement."),
  });

  const { mutate: upgradePro, isPending: isUpgradingPro } = useMutation({
    mutationFn: async () => {
      const priceId = billingPeriod === "annual" ? import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL : import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
      const { url } = await stripeService.createCheckoutSession(priceId ?? "");
      window.location.href = url;
    },
    onError: () => setError("Impossible d'ouvrir la page de paiement."),
  });

  const { mutate: upgradeDuo, isPending: isUpgradingDuo } = useMutation({
    mutationFn: async () => {
      if (user?.role !== "GERANTE_CREATRICE") {
        setUser(await stripeService.upgradeDuo());
      }
      const priceId = billingPeriod === "annual" ? import.meta.env.VITE_STRIPE_PRICE_DUO_ANNUAL : import.meta.env.VITE_STRIPE_PRICE_DUO_MONTHLY;
      const { url } = await stripeService.createCheckoutSession(priceId ?? "");
      window.location.href = url;
    },
    onError: () => setError("Impossible d'ouvrir la page de paiement DUO."),
  });

  const { mutate: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: () => userService.deleteAccount(),
    onSuccess: () => {
      logout();
      navigate("/login", { replace: true });
    },
    onError: () => {
      setError("Impossible de supprimer le compte. Réessaye plus tard.");
      setDeleteStep("none");
    },
  });

  function handleCancelEdit() {
    setEditPrenom(user?.prenom ?? "");
    setEditNom(user?.nom ?? "");
    setIsEditing(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
    e.target.value = "";
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const displayName = [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Mon compte";

  return (
    <div className={styles.page}>
      <Card className={styles.header}>
        <button
          type="button"
          className={styles.avatarWrap}
          onClick={() => avatarInputRef.current?.click()}
          disabled={isUploadingAvatar}
          aria-label="Changer la photo de profil"
        >
          <Avatar name={displayName} src={user?.avatar} size="lg" />
          <span className={styles.cameraBtn}>{isUploadingAvatar ? "…" : "📷"}</span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleAvatarChange} />

        <div className={styles.identity}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.email}>{user?.email}</p>
          <div className={styles.badgeRow}>
            <Badge color="primary" variant="solid">
              {gerante ? "Gérante" : "Créatrice"}
            </Badge>
            {isPlanDuo ? (
              <Badge color="warning" variant="solid">
                DUO
              </Badge>
            ) : (
              <Badge color={isPlanPro ? "success" : "neutral"} variant="solid">
                {isPlanPro ? "✨ PRO" : "FREE"}
              </Badge>
            )}
          </div>
          {duo && <DuoModeToggle />}
        </div>
      </Card>

      {error && <Banner variant="error">{error}</Banner>}

      {!gerante && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mes événements</h2>
          <Card>
            {mesEvenements.map((ev, i) => (
              <div key={ev.id}>
                {i > 0 && <div className={styles.divider} />}
                <button type="button" className={styles.eventRow} onClick={() => handleOuvrirEvenement(ev)}>
                  <span>🎪 {ev.nom}</span>
                  <span className={styles.infoValue}>{new Date(ev.dateDebut).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}</span>
                </button>
              </div>
            ))}

            {mesBoutiques.length > 0 && (
              <>
                {mesEvenements.length > 0 && <div className={styles.divider} />}
                {mesBoutiques.map((b, i) => (
                  <div key={b.id}>
                    {i > 0 && <div className={styles.divider} />}
                    <button type="button" className={styles.eventRow} onClick={() => navigate(`/mes-ventes/${b.id}?nom=${encodeURIComponent(b.nom)}`)}>
                      <span>Membre de {b.nom}</span>
                      <span>›</span>
                    </button>
                  </div>
                ))}
              </>
            )}

            {(mesEvenements.length > 0 || mesBoutiques.length > 0) && <div className={styles.divider} />}

            {canCreateEvent ? (
              creatingEvent ? (
                <form onSubmit={handleCreerEvenement} className={styles.inlineForm}>
                  <label className={styles.infoLabel} htmlFor="nomEvenement">
                    Nom de l'événement
                  </label>
                  <input
                    id="nomEvenement"
                    className={fieldControl}
                    value={nomEvenement}
                    onChange={(e) => setNomEvenement(e.target.value)}
                    placeholder="Ex : Marché de Noël 2026"
                    autoFocus
                  />
                  <div className={styles.editActions}>
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setCreatingEvent(false);
                        setNomEvenement("");
                      }}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" fullWidth disabled={!nomEvenement.trim() || creatingEventPending}>
                      {creatingEventPending ? "…" : "Créer"}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" fullWidth onClick={() => setCreatingEvent(true)}>
                  + Créer un événement
                </Button>
              )
            ) : (
              <Notice>🔒 Plan FREE · 1 événement max. Passe à PRO pour en créer davantage.</Notice>
            )}
          </Card>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mon compte</h2>
        <Card>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user?.email ?? "—"}</span>
          </div>
          <div className={styles.divider} />
          {isEditing ? (
            <>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Prénom</span>
                <input className={styles.editInput} value={editPrenom} onChange={(e) => setEditPrenom(e.target.value)} placeholder="Ton prénom" />
              </div>
              <div className={styles.divider} />
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Nom</span>
                <input className={styles.editInput} value={editNom} onChange={(e) => setEditNom(e.target.value)} placeholder="Ton nom" />
              </div>
              <div className={styles.divider} />
              <div className={styles.editActions}>
                <Button variant="secondary" fullWidth onClick={handleCancelEdit}>
                  Annuler
                </Button>
                <Button fullWidth onClick={() => saveProfile()} disabled={isSaving}>
                  {isSaving ? "…" : "Enregistrer"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Prénom</span>
                <span className={styles.infoValue}>{user?.prenom || "—"}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Nom</span>
                <span className={styles.infoValue}>{user?.nom || "—"}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Depuis</span>
                <span className={styles.infoValue}>{user?.createdAt ? formatDateLong(user.createdAt) : "—"}</span>
              </div>
              <div className={styles.divider} />
              <Button variant="secondary" fullWidth onClick={() => setIsEditing(true)}>
                ✏️ Modifier le nom / prénom
              </Button>
            </>
          )}
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Préférences</h2>
        <Card>
          <label className={styles.switchRow}>
            <div>
              <div className={styles.switchLabel}>Notifications email</div>
              <div className={styles.switchDesc}>Reçois un email à chaque vente enregistrée</div>
            </div>
            <input
              type="checkbox"
              checked={user?.notificationsEmail ?? false}
              onChange={(e) => toggleNotif(e.target.checked)}
              disabled={isTogglingNotif}
            />
          </label>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Abonnement</h2>
        <Card>
          {isPlanDuo ? (
            <div className={styles.planBlock}>
              <div className={styles.planHeader}>
                <span className={styles.planTitleDuo}>DUO</span>
                <Badge color="warning">Actif</Badge>
              </div>
              <p className={styles.planDesc}>Boutique + Créatrice · Multi-boutiques · Stats avancées · Historique complet</p>
              <div className={styles.divider} />
              <Button variant="link" style={{ color: "var(--color-error)" }} onClick={() => setConfirmCancelOpen(true)} disabled={isCancelling}>
                {isCancelling ? "Résiliation en cours…" : "Résilier l'abonnement"}
              </Button>
            </div>
          ) : isPlanPro ? (
            <div className={styles.planBlock}>
              <div className={styles.planHeader}>
                <span className={styles.planTitle}>✨ Plan PRO</span>
                <Badge color="success">Actif</Badge>
              </div>
              <p className={styles.planDesc}>Multi-boutiques · Stats avancées · Historique complet · Exports illimités sans filigrane</p>
              <div className={styles.divider} />
              <Button variant="link" style={{ color: "var(--color-error)" }} onClick={() => setConfirmCancelOpen(true)} disabled={isCancelling}>
                {isCancelling ? "Résiliation en cours…" : "Résilier l'abonnement"}
              </Button>
            </div>
          ) : duo ? (
            <div className={styles.freeBlock}>
              <p className={styles.freeTitle}>Plan FREE</p>
              <p className={styles.freeDesc}>Accède aux fonctionnalités Gérante ET Créatrice avec un seul abonnement DUO.</p>
              <div className={styles.divider} />
              <p className={styles.upgradeLabel}>Débloque tout avec DUO</p>
              <ul className={styles.featureList}>
                <li>Gérante + Créatrice sur un seul compte</li>
                <li>Multi-boutiques · Stats avancées</li>
                <li>Historique complet · Exports illimités</li>
              </ul>
              <div className={styles.periodToggle}>
                <button type="button" className={billingPeriod === "monthly" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("monthly")} aria-pressed={billingPeriod === "monthly"}>
                  Mensuel · 15€
                </button>
                <button type="button" className={billingPeriod === "annual" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("annual")} aria-pressed={billingPeriod === "annual"}>
                  Annuel · 129€ 🏷️
                </button>
              </div>
              <Button fullWidth style={{ background: "#eb7f45" }} onClick={() => (PAIEMENT_ACTIF ? upgradeDuo() : setPaiementInfo(true))} disabled={isUpgradingDuo}>
                {isUpgradingDuo ? "Ouverture…" : billingPeriod === "annual" ? "Passer en DUO — 129€/an" : "Passer en DUO — 15€/mois"}
              </Button>
              {paiementInfo && <Notice>{PAIEMENT_MSG}</Notice>}
            </div>
          ) : (
            <div className={styles.freeBlock}>
              <p className={styles.freeTitle}>Plan FREE</p>
              <p className={styles.freeDesc}>1 boutique · 3 créatrices max · Historique 1 mois · Export PDF avec filigrane</p>
              <div className={styles.divider} />
              <p className={styles.upgradeLabel}>Débloque tout avec PRO</p>
              <ul className={styles.featureList}>
                <li>Multi-boutiques</li>
                <li>Historique complet (3 mois+)</li>
                <li>Stats avancées par créatrice</li>
                <li>CSV &amp; Excel sans limite</li>
                <li>PDF sans filigrane</li>
              </ul>
              <div className={styles.periodToggle}>
                <button type="button" className={billingPeriod === "monthly" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("monthly")} aria-pressed={billingPeriod === "monthly"}>
                  Mensuel · 9€
                </button>
                <button type="button" className={billingPeriod === "annual" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("annual")} aria-pressed={billingPeriod === "annual"}>
                  Annuel · 79€ 🏷️
                </button>
              </div>
              <Button fullWidth onClick={() => (PAIEMENT_ACTIF ? upgradePro() : setPaiementInfo(true))} disabled={isUpgradingPro}>
                ⭐ {isUpgradingPro ? "Ouverture…" : billingPeriod === "annual" ? "Passer à PRO — 79€/an" : "Passer à PRO — 9€/mois"}
              </Button>
              {paiementInfo && <Notice>{PAIEMENT_MSG}</Notice>}
            </div>
          )}
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Aide</h2>
        <Card className={styles.helpCard}>
          <Button variant="secondary" fullWidth onClick={() => navigate("/aide")}>
            📖 Guide complet
          </Button>
          <a className={styles.legalLink} href="/legal" target="_blank" rel="noreferrer">
            📄 CGU &amp; Politique de confidentialité
          </a>
        </Card>
      </section>

      <Button variant="dangerOutline" fullWidth onClick={handleLogout}>
        🚪 Se déconnecter
      </Button>

      <Button
        variant="link"
        style={{ color: "var(--color-text-light)", textDecoration: "underline", margin: "0 auto" }}
        onClick={() => setDeleteStep("first")}
        disabled={isDeletingAccount}
      >
        {isDeletingAccount ? "Suppression en cours…" : "Supprimer mon compte"}
      </Button>

      <p className={styles.footer}>Encaissly · La caisse intelligente des boutiques de créateurs</p>

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Résilier l'abonnement"
        message="Tu vas repasser en plan FREE. Tu perdras l'accès aux fonctionnalités PRO immédiatement. Continuer ?"
        confirmLabel="Résilier"
        danger
        pending={isCancelling}
        onConfirm={() => {
          setConfirmCancelOpen(false);
          cancelPlan();
        }}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      {/* Suppression de compte — confirmation en 2 temps, comme sur mobile */}
      <ConfirmDialog
        open={deleteStep === "first"}
        title="Supprimer mon compte"
        message={
          gerante
            ? "Cette action est irréversible. Tes boutiques, créatrices, ventes et statistiques seront définitivement supprimées."
            : "Cette action est irréversible. Ton compte et tes informations personnelles seront définitivement supprimés."
        }
        confirmLabel="Continuer"
        danger
        onConfirm={() => setDeleteStep("second")}
        onCancel={() => setDeleteStep("none")}
      />
      <ConfirmDialog
        open={deleteStep === "second"}
        title="Dernière confirmation"
        message="Veux-tu vraiment supprimer définitivement ton compte Encaissly ?"
        confirmLabel="Oui, supprimer"
        danger
        pending={isDeletingAccount}
        onConfirm={() => deleteAccount()}
        onCancel={() => setDeleteStep("none")}
      />
    </div>
  );
}
