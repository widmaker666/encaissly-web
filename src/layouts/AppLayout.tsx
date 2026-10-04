import { NavLink, Outlet, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import styles from "./AppLayout.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord" },
  { to: "/ventes", label: "Ventes" },
  { to: "/creatrices", label: "Créatrices", gerante: true },
  { to: "/stats", label: "Stats" },
  { to: "/notifications", label: "Notifications" },
  { to: "/profil", label: "Profil" },
];

/** Menu latéral + zone de contenu — équivalent des onglets du bas sur mobile. */
export default function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const logout = useAuthStore((s) => s.logout);
  const gerante = isGerante(user, duoMode);
  const navItems = NAV_ITEMS.filter((item) => !item.gerante || gerante);

  // Même intervalle que le mobile (badge cloche du Dashboard) — reste à jour
  // sans que la personne ait besoin d'ouvrir l'onglet Notifications.
  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ["notifications-count"],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30000,
  });
  const unreadCount = unread?.count ?? 0;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initiale = (user?.prenom ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <h1 className={styles.logo}>Encaissly</h1>

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink)}
              >
                {item.label}
                {item.to === "/notifications" && unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.footer}>
          {user && (
            <div className={styles.userRow}>
              <div className={styles.avatar}>{initiale}</div>
              <div>
                <div className={styles.userName}>{user.prenom ?? user.email}</div>
                <div className={styles.userPlan}>
                  {user.plan ?? "FREE"}
                  {isDuo(user) && " · DUO"}
                </div>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
