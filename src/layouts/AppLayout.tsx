import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import DuoModeToggle from "@/components/DuoModeToggle";
import styles from "./AppLayout.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Accueil" },
  { to: "/ventes", label: "Ventes" },
  { to: "/creatrices", label: "Créatrices", gerante: true },
  { to: "/evenements", label: "Événements", creatrice: true },
  { to: "/stats", label: "Stats" },
  { to: "/documents", label: "Documents", separator: true },
  { to: "/compte", label: "Compte" },
];

/** Menu latéral + zone de contenu — équivalent des onglets du bas sur mobile. */
export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const logout = useAuthStore((s) => s.logout);
  const gerante = isGerante(user, duoMode);
  const navItems = NAV_ITEMS.filter((item) => (!item.gerante || gerante) && (!item.creatrice || !gerante));

  // Un compte DUO qui bascule en vue créatrice alors qu'il est sur un écran
  // réservé à la gérante (liste/fiche créatrice) retombe sur l'accueil plutôt
  // que de rester sur une page qui n'a plus d'entrée dans son menu.
  useEffect(() => {
    if (!gerante && pathname.startsWith("/creatrices")) navigate("/", { replace: true });
  }, [gerante, pathname, navigate]);

  // Même intervalle que le mobile (badge cloche du Dashboard) — reste à jour
  // sans que la personne ait besoin d'ouvrir la page Notifications.
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
          <p className={styles.logo}>Encaissly</p>

          {/* Un seul sélecteur de vue pour tout le site (avant : répété en haut de chaque page) */}
          {isDuo(user) && <DuoModeToggle variant="dark" fullWidth />}

          <nav className={styles.nav}>
            {navItems.map((item) => (
              <div key={item.to} className={styles.navItem}>
                {item.separator && <div className={styles.navSep} role="separator" />}
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink)}
                >
                  {item.label}
                </NavLink>
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.footer}>
          {user && (
            <div className={styles.userRow}>
              <div className={styles.avatar}>{initiale}</div>
              <div>
                <div className={styles.userName}>{user.prenom ?? user.email}</div>
                <div className={styles.userPlan}>Plan {user.plan ?? "FREE"}</div>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <div className={styles.topbar}>
          <Link
            to="/notifications"
            className={pathname === "/notifications" ? `${styles.bell} ${styles.bellActive}` : styles.bell}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
        </div>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
