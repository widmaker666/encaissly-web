import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo } from "@/lib/access";
import styles from "./AppLayout.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord" },
  { to: "/ventes", label: "Ventes" },
  { to: "/creatrices", label: "Créatrices" },
  { to: "/stats", label: "Stats" },
  { to: "/profil", label: "Profil" },
];

/** Menu latéral + zone de contenu — équivalent des onglets du bas sur mobile. */
export default function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <h1 className={styles.logo}>Encaissly</h1>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          {user && (
            <p className={styles.user}>
              {user.prenom ?? user.email}
              {isDuo(user) && " · DUO"}
            </p>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
