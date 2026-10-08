import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { isDuo, isGerante } from "@/lib/access";
import DuoModeToggle from "@/components/DuoModeToggle";
import styles from "./AppLayout.module.css";

type IconName = "home" | "cart" | "users" | "calendar" | "chart" | "more" | "file" | "user" | "bell" | "logout";

const NAV_ITEMS: { to: string; label: string; icon: IconName; gerante?: boolean; creatrice?: boolean; separator?: boolean }[] = [
  { to: "/", label: "Accueil", icon: "home" },
  { to: "/ventes", label: "Ventes", icon: "cart" },
  { to: "/creatrices", label: "Créatrices", icon: "users", gerante: true },
  { to: "/evenements", label: "Événements", icon: "calendar", creatrice: true },
  { to: "/stats", label: "Stats", icon: "chart" },
  { to: "/documents", label: "Documents", icon: "file", separator: true },
  { to: "/compte", label: "Compte", icon: "user" },
];

// Sur téléphone : 4 onglets principaux dans la barre du bas, le reste sous « Plus »
const PRIMARY_PATHS = ["/", "/ventes", "/creatrices", "/evenements", "/stats"];
const MORE_PATHS = ["/documents", "/compte", "/notifications"];

const ICON_PATHS: Record<IconName, string[]> = {
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10"],
  cart: ["M3 5h2l2.4 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6", "M9 20.2h.01", "M17 20.2h.01"],
  users: ["M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5", "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", "M16 4.6a3.5 3.5 0 0 1 0 6.8", "M18 14.8c2 .6 3.2 2.4 3.5 5.2"],
  calendar: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M3 10h18", "M8 3v4", "M16 3v4"],
  chart: ["M4 20V10", "M10 20V4", "M16 20v-8", "M22 20H2"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
  user: ["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M4 21c.8-4 4-6 8-6s7.2 2 8 6"],
  bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8", "M10 20a2 2 0 0 0 4 0"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
};

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Menu latéral (ordinateur) ou barre d'onglets en bas (téléphone) + zone de contenu. */
export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const duoMode = useAuthStore((s) => s.duoMode);
  const logout = useAuthStore((s) => s.logout);
  const gerante = isGerante(user, duoMode);
  const navItems = NAV_ITEMS.filter((item) => (!item.gerante || gerante) && (!item.creatrice || !gerante));
  const tabs = navItems.filter((item) => PRIMARY_PATHS.includes(item.to));
  const [moreOpen, setMoreOpen] = useState(false);

  // Un compte DUO qui bascule en vue créatrice alors qu'il est sur un écran
  // réservé à la gérante (liste/fiche créatrice) retombe sur l'accueil plutôt
  // que de rester sur une page qui n'a plus d'entrée dans son menu.
  useEffect(() => {
    if (!gerante && pathname.startsWith("/creatrices")) navigate("/", { replace: true });
  }, [gerante, pathname, navigate]);

  // Le panneau « Plus » se referme à chaque changement de page, et avec Échap
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

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
  const moreActive = MORE_PATHS.some((p) => pathname.startsWith(p));

  const bell = (className: string) => (
    <Link
      to="/notifications"
      className={pathname === "/notifications" ? `${styles.bell} ${styles.bellActive} ${className}` : `${styles.bell} ${className}`}
      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
    >
      <Icon name="bell" size={18} />
      {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Link>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <p className={styles.logo}>Encaissly</p>

          {/* Un seul sélecteur de vue pour tout le site (avant : répété en haut de chaque page) */}
          {isDuo(user) && <DuoModeToggle variant="dark" fullWidth />}

          <nav className={styles.nav} aria-label="Navigation principale">
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

        {/* Téléphone : la cloche vit dans l'en-tête (le bloc topbar du contenu est masqué) */}
        {bell(styles.bellHeader)}

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
        <div className={styles.topbar}>{bell("")}</div>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </main>

      {/* ── Téléphone : barre d'onglets en bas ── */}
      <nav className={styles.tabbar} aria-label="Navigation principale">
        {tabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={moreOpen || moreActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          <span className={styles.tabIcon}>
            <Icon name="more" />
            {unreadCount > 0 && <span className={styles.tabDot} />}
          </span>
          <span>Plus</span>
        </button>
      </nav>

      {moreOpen && (
        <div className={styles.sheetOverlay} onClick={() => setMoreOpen(false)}>
          <div className={styles.sheet} role="dialog" aria-label="Plus" onClick={(e) => e.stopPropagation()}>
            {user && (
              <div className={styles.sheetUser}>
                <div className={styles.avatar}>{initiale}</div>
                <div>
                  <div className={styles.sheetUserName}>{user.prenom ?? user.email}</div>
                  <div className={styles.sheetUserPlan}>Plan {user.plan ?? "FREE"}</div>
                </div>
              </div>
            )}
            <Link to="/documents" className={styles.sheetLink}>
              <Icon name="file" size={20} /> Documents
            </Link>
            <Link to="/notifications" className={styles.sheetLink}>
              <Icon name="bell" size={20} /> Notifications
              {unreadCount > 0 && <span className={styles.sheetBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </Link>
            <Link to="/compte" className={styles.sheetLink}>
              <Icon name="user" size={20} /> Compte
            </Link>
            <button type="button" className={`${styles.sheetLink} ${styles.sheetLogout}`} onClick={handleLogout}>
              <Icon name="logout" size={20} /> Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
