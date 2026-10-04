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

  const initiales = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join("").toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const displayName = [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Mon compte";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button type="button" className={styles.avatarWrap} onClick={() => avatarInputRef.current?.click()} disabled={isUploadingAvatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholder}>{initiales}</div>
          )}
          <span className={styles.cameraBtn}>{isUploadingAvatar ? "…" : "📷"}</span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleAvatarChange} />

        <h2 className={styles.name}>{displayName}</h2>
        <p className={styles.email}>{user?.email}</p>
        <div className={styles.badgeRow}>
          <span className={styles.badgePrimary}>{gerante ? "Gérante" : "Créatrice"}</span>
          {isPlanDuo ? (
            <span className={styles.badgeDuo}>DUO</span>
          ) : (
            <span className={isPlanPro ? styles.badgePro : styles.badgeFree}>{isPlanPro ? "✨ PRO" : "FREE"}</span>
          )}
        </div>
        {duo && <DuoModeToggle />}
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {!gerante && (
        <>
          <h3 className={styles.sectionTitle}>Mes événements</h3>
          <div className={styles.card}>
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
                <form onSubmit={handleCreerEvenement}>
                  <label className={styles.infoLabel} htmlFor="nomEvenement">
                    Nom de l'événement
                  </label>
                  <input
                    id="nomEvenement"
                    className={styles.editInput}
                    style={{ textAlign: "left", width: "100%", marginTop: 6 }}
                    value={nomEvenement}
                    onChange={(e) => setNomEvenement(e.target.value)}
                    placeholder="Ex : Marché de Noël 2026"
                    autoFocus
                  />
                  <div className={styles.editActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => {
                        setCreatingEvent(false);
                        setNomEvenement("");
                      }}
                    >
                      Annuler
                    </button>
                    <button type="submit" className={styles.saveBtn} disabled={!nomEvenement.trim() || creatingEventPending}>
                      {creatingEventPending ? "…" : "Créer"}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className={styles.editBtn} onClick={() => setCreatingEvent(true)}>
                  + Créer un événement
                </button>
              )
            ) : (
              <p className={styles.notice} style={{ margin: 0 }}>
                🔒 Plan FREE · 1 événement max. Passe à PRO pour en créer davantage.
              </p>
            )}
          </div>
        </>
      )}

      <h3 className={styles.sectionTitle}>Mon compte</h3>
      <div className={styles.card}>
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
              <button type="button" className={styles.cancelBtn} onClick={handleCancelEdit}>
                Annuler
              </button>
              <button type="button" className={styles.saveBtn} onClick={() => saveProfile()} disabled={isSaving}>
                {isSaving ? "…" : "Enregistrer"}
              </button>
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
            <button type="button" className={styles.editBtn} onClick={() => setIsEditing(true)}>
              ✏️ Modifier le nom / prénom
            </button>
          </>
        )}
      </div>

      <h3 className={styles.sectionTitle}>Préférences</h3>
      <div className={styles.card}>
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
      </div>

      <h3 className={styles.sectionTitle}>Abonnement</h3>
      <div className={styles.card}>
        {isPlanDuo ? (
          <div className={styles.planBlock}>
            <div className={styles.planHeader}>
              <span className={styles.planTitleDuo}>DUO</span>
              <span className={styles.activeBadgeDuo}>Actif</span>
            </div>
            <p className={styles.planDesc}>Boutique + Créatrice · Multi-boutiques · Stats avancées · Historique complet</p>
            <div className={styles.divider} />
            <button type="button" className={styles.resilierBtn} onClick={() => setConfirmCancelOpen(true)} disabled={isCancelling}>
              {isCancelling ? "Résiliation en cours…" : "Résilier l'abonnement"}
            </button>
          </div>
        ) : isPlanPro ? (
          <div className={styles.planBlock}>
            <div className={styles.planHeader}>
              <span className={styles.planTitle}>✨ Plan PRO</span>
              <span className={styles.activeBadge}>Actif</span>
            </div>
            <p className={styles.planDesc}>Multi-boutiques · Stats avancées · Historique complet · Exports illimités sans filigrane</p>
            <div className={styles.divider} />
            <button type="button" className={styles.resilierBtn} onClick={() => setConfirmCancelOpen(true)} disabled={isCancelling}>
              {isCancelling ? "Résiliation en cours…" : "Résilier l'abonnement"}
            </button>
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
              <button type="button" className={billingPeriod === "monthly" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("monthly")}>
                Mensuel · 15€
              </button>
              <button type="button" className={billingPeriod === "annual" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("annual")}>
                Annuel · 129€ 🏷️
              </button>
            </div>
            <button type="button" className={styles.duoBtn} onClick={() => upgradeDuo()} disabled={isUpgradingDuo}>
              {isUpgradingDuo ? "Ouverture…" : billingPeriod === "annual" ? "Passer en DUO — 129€/an" : "Passer en DUO — 15€/mois"}
            </button>
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
              <button type="button" className={billingPeriod === "monthly" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("monthly")}>
                Mensuel · 9€
              </button>
              <button type="button" className={billingPeriod === "annual" ? `${styles.periodBtn} ${styles.periodBtnActive}` : styles.periodBtn} onClick={() => setBillingPeriod("annual")}>
                Annuel · 79€ 🏷️
              </button>
            </div>
            <button type="button" className={styles.upgradeBtn} onClick={() => upgradePro()} disabled={isUpgradingPro}>
              ⭐ {isUpgradingPro ? "Ouverture…" : billingPeriod === "annual" ? "Passer à PRO — 79€/an" : "Passer à PRO — 9€/mois"}
            </button>
          </div>
        )}
      </div>

      <h3 className={styles.sectionTitle}>Aide</h3>
      <div className={styles.card}>
        <button type="button" className={styles.editBtn} style={{ marginBottom: 8 }} onClick={() => navigate("/aide")}>
          📖 Guide complet
        </button>
        <a className={styles.legalLink} href="/legal" target="_blank" rel="noreferrer">
          📄 CGU &amp; Politique de confidentialité
        </a>
      </div>

      <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
        🚪 Se déconnecter
      </button>

      <button type="button" className={styles.deleteAccountBtn} onClick={() => setDeleteStep("first")} disabled={isDeletingAccount}>
        {isDeletingAccount ? "Suppression en cours…" : "Supprimer mon compte"}
      </button>

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
