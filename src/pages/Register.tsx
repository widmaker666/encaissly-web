import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/errors";
import { loadGoogleScript } from "@/lib/google";
import type { Role } from "@/types";
import styles from "./Register.module.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type Method = "google" | "email" | null;

const ROLES: { key: Role; icon: string; title: string; desc: string }[] = [
  { key: "GERANTE", icon: "🏪", title: "Gérante", desc: "Je gère une boutique" },
  { key: "CREATRICE", icon: "🎨", title: "Créatrice", desc: "Je vends mes créations" },
];

export default function Register() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  // "choice" = écran initial (Google / Email), "form" = formulaire à compléter
  const [step, setStep] = useState<"choice" | "form">("choice");
  const [method, setMethod] = useState<Method>(null);

  // idToken Google conservé le temps que la personne complète rôle + CGU —
  // le compte n'est créé qu'à la soumission finale, jamais avant (même
  // logique que le mobile).
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function finishAuth(accessToken: string, refreshToken: string) {
    setTokens(accessToken, refreshToken);
    const user = await authService.getProfile();
    setUser(user);
    navigate("/", { replace: true });
  }

  // Bouton Google rendu sur l'écran de choix — même route que le login,
  // mais ici la callback ne crée pas de compte tout de suite : elle garde
  // juste l'idToken et passe à l'étape rôle + CGU.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== "choice") return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleBtnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            // Décode juste le payload du JWT pour pré-remplir le formulaire —
            // pas d'appel réseau ici, le token est vérifié côté backend plus tard.
            try {
              const payload = JSON.parse(atob(response.credential.split(".")[1]));
              setEmail(payload.email ?? "");
              setPrenom(payload.given_name ?? "");
              setNom(payload.family_name ?? "");
            } catch {
              // tant pis pour le pré-remplissage, le token reste utilisable
            }
            setGoogleIdToken(response.credential);
            setMethod("google");
            setStep("form");
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 312,
          text: "signup_with",
          locale: "fr",
        });
      })
      .catch((err) => setError(getErrorMessage(err)));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handleBack() {
    setStep("choice");
    setMethod(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError("Choisis ton type de compte.");
      return;
    }
    if (!acceptedCGU) {
      setError("Tu dois accepter les CGU et la politique de confidentialité.");
      return;
    }

    setLoading(true);
    try {
      if (method === "google") {
        if (!googleIdToken) return;
        const { accessToken, refreshToken } = await authService.googleMobile(googleIdToken, role, true);
        await finishAuth(accessToken, refreshToken);
        return;
      }

      if (!email || !password) {
        setError("Remplis tous les champs.");
        return;
      }
      if (password.length < 8) {
        setError("Le mot de passe doit faire au moins 8 caractères.");
        return;
      }
      await authService.register(email, password, nom || undefined, prenom || undefined, role, true);
      const { accessToken, refreshToken } = await authService.login(email, password);
      await finishAuth(accessToken, refreshToken);
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors de l'inscription."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {step === "choice" ? (
          <>
            <h1 className={styles.title}>Inscription</h1>
            <p className={styles.subtitle}>Crée ton compte en quelques secondes.</p>

            {error && <p className={styles.error}>{error}</p>}

            {GOOGLE_CLIENT_ID && <div className={styles.googleBtn} ref={googleBtnRef} />}

            <button type="button" className={styles.emailBtn} onClick={() => { setMethod("email"); setStep("form"); }}>
              S'inscrire avec email
            </button>

            <p className={styles.footer}>
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <button type="button" className={styles.backBtn} onClick={handleBack}>
              ‹ Retour
            </button>
            <h1 className={styles.title}>{method === "google" ? "Finaliser l'inscription" : "Inscription"}</h1>
            <p className={styles.subtitle}>
              {method === "google" ? "Il ne reste que quelques infos à compléter." : "Crée ton compte."}
            </p>

            {method === "google" && (
              <div className={styles.lockedRow}>
                <span>{email}</span>
                <span>🔒</span>
              </div>
            )}

            <label className={styles.label}>Je suis…</label>
            <div className={styles.roleRow}>
              {ROLES.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={role === item.key ? `${styles.roleCard} ${styles.roleCardSelected}` : styles.roleCard}
                  onClick={() => setRole(item.key)}
                >
                  <span className={styles.roleIcon}>{item.icon}</span>
                  <span className={styles.roleTitle}>{item.title}</span>
                  <span className={styles.roleDesc}>{item.desc}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={role === "GERANTE_CREATRICE" ? `${styles.roleCardDuo} ${styles.roleCardSelected}` : styles.roleCardDuo}
              onClick={() => setRole("GERANTE_CREATRICE")}
            >
              <span className={styles.roleIcon}>🏪🎨</span>
              <span>
                <span className={styles.roleTitle}>Gérante &amp; Créatrice</span>
                <span className={styles.roleDesc}>Je gère ma boutique ET je vends mes propres créations</span>
              </span>
            </button>

            {method === "email" && (
              <>
                <label className={styles.label} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </>
            )}

            <label className={styles.label} htmlFor="prenom">
              Prénom
            </label>
            <input id="prenom" className={styles.input} value={prenom} onChange={(e) => setPrenom(e.target.value)} />

            <label className={styles.label} htmlFor="nom">
              Nom
            </label>
            <input id="nom" className={styles.input} value={nom} onChange={(e) => setNom(e.target.value)} />

            {method === "email" && (
              <>
                <label className={styles.label} htmlFor="password">
                  Mot de passe
                </label>
                <input
                  id="password"
                  className={styles.input}
                  type="password"
                  placeholder="8 caractères min"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}

            <label className={styles.cguRow}>
              <input type="checkbox" checked={acceptedCGU} onChange={(e) => setAcceptedCGU(e.target.checked)} />
              <span>
                J'accepte les{" "}
                <Link to="/legal" target="_blank" rel="noreferrer">
                  CGU et la politique de confidentialité
                </Link>
              </span>
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={loading || !acceptedCGU}>
              {loading ? "Création…" : "Créer mon compte"}
            </button>

            <p className={styles.footer}>
              Déjà un compte ? <Link to="/login">Se connecter</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
