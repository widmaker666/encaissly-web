import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/errors";
import { loadGoogleScript } from "@/lib/google";
import Button from "@/components/Button";
import { InputField } from "@/components/Field";
import Banner from "@/components/Banner";
import styles from "./Login.module.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  async function finishLogin(accessToken: string, refreshToken: string) {
    setTokens(accessToken, refreshToken);
    const user = await authService.getProfile();
    setUser(user);
    navigate("/", { replace: true });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await authService.login(email, password);
      await finishLogin(accessToken, refreshToken);
    } catch (err) {
      setError(getErrorMessage(err, "Identifiants incorrects."));
    } finally {
      setLoading(false);
    }
  }

  // Même route que le mobile (/auth/google/mobile) — sans `role`/`acceptedCGU`,
  // donc valable uniquement pour un compte Google déjà existant (login). Un
  // compte Google qui n'existe pas encore reçoit un message clair du backend
  // ("Inscrivez-vous d'abord") plutôt qu'une création silencieuse.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleBtnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setError(null);
            setGoogleLoading(true);
            try {
              const { accessToken, refreshToken } = await authService.googleMobile(response.credential);
              await finishLogin(accessToken, refreshToken);
            } catch (err) {
              setError(getErrorMessage(err, "Connexion Google échouée."));
            } finally {
              setGoogleLoading(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 312,
          text: "continue_with",
          locale: "fr",
        });
      })
      .catch((err) => setError(getErrorMessage(err)));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Encaissly</h1>
        <p className={styles.subtitle}>Connecte-toi pour accéder à ta compta.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <InputField
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <InputField
            label="Mot de passe"
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <Banner variant="error">{error}</Banner>}

          <Button type="submit" fullWidth disabled={loading || googleLoading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className={styles.divider}>
              <span>OU</span>
            </div>
            <div className={styles.googleBtn} ref={googleBtnRef} />
            {googleLoading && <p className={styles.hint}>Connexion…</p>}
          </>
        )}

        <p className={styles.footer}>
          Pas de compte ? <Link to="/register">S'inscrire</Link>
        </p>
        <p className={styles.footer}>
          <Link to="/legal">Mentions légales · CGU · CGV · Confidentialité</Link>
        </p>
      </div>
    </div>
  );
}
