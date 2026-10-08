import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, stripeService, userService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import { formatDateLong } from "@/lib/date";
import { getErrorMessage } from "@/lib/errors";
import ConfirmDialog from "@/components/ConfirmDialog";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import Banner from "@/components/Banner";
import Notice from "@/components/Notice";

// Passer à true quand Stripe live sera activé (SIRET en cours)
const PAIEMENT_ACTIF = false;
const CONTACT_EMAIL = "contact.encaissly@gmail.com";
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Encaissly — bug ou suggestion")}`;
const PAIEMENT_MSG = "Les abonnements ne sont pas encore disponibles : le site et l'application sont en phase de test. Ça arrive très bientôt !";
import styles from "./Profil.module.css";

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
  const [cancelInfo, setCancelInfo] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<"none" | "first" | "second">("none");
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    onSuccess: async ({ endsAt }) => {
      setCancelInfo(endsAt ? `Résiliation enregistrée : ton abonnement reste actif jusqu'au ${new Date(endsAt).toLocaleDateString("fr-FR")}, puis tu repasseras en plan FREE.` : "Résiliation enregistrée : ton abonnement reste actif jusqu'à la fin de la période payée.");
      setUser(await authService.getProfile());
    },
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
        </div>
      </Card>

      {error && <Banner variant="error">{error}</Banner>}
      {cancelInfo && <Banner variant="success">{cancelInfo}</Banner>}

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
              <Button fullWidth style={{ background: "var(--color-duo)" }} onClick={() => (PAIEMENT_ACTIF ? upgradeDuo() : setPaiementInfo(true))} disabled={isUpgradingDuo}>
                {isUpgradingDuo ? "Ouverture…" : billingPeriod === "annual" ? "Passer en DUO — 129€/an" : "Passer en DUO — 15€/mois"}
              </Button>
              <p className={styles.cgvHint}>
                Sans engagement, résiliable à tout moment. En vous abonnant, vous acceptez les{" "}
                <a href="/legal#cgv" target="_blank" rel="noreferrer">CGV</a>.
              </p>
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
              <p className={styles.cgvHint}>
                Sans engagement, résiliable à tout moment. En vous abonnant, vous acceptez les{" "}
                <a href="/legal#cgv" target="_blank" rel="noreferrer">CGV</a>.
              </p>
              {paiementInfo && <Notice>{PAIEMENT_MSG}</Notice>}
            </div>
          )}
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Un bug ? Une idée ?</h2>
        <Card className={styles.helpCard}>
          <p className={styles.contactDesc}>
            Encaissly est en phase de test : dis-moi ce qui ne marche pas ou ce que tu aimerais voir en plus, je lis tous les messages.
          </p>
          <a className={styles.contactBtn} href={CONTACT_MAILTO}>
            ✉️ Écrire à {CONTACT_EMAIL}
          </a>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Aide</h2>
        <Card className={styles.helpCard}>
          <Button variant="secondary" fullWidth onClick={() => navigate("/aide")}>
            📖 Guide complet
          </Button>
          <a className={styles.legalLink} href="/legal" target="_blank" rel="noreferrer">
            📄 Informations légales (CGU, CGV, confidentialité)
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
        message="Ton abonnement restera actif jusqu'à la fin de la période déjà payée (pas de remboursement au prorata), puis tu repasseras en plan FREE. Continuer ?"
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
