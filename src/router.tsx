import { createBrowserRouter, Navigate, Outlet } from "react-router";
import type { ComponentType } from "react";
import { useAuthStore } from "@/stores/auth.store";
import AppLayout from "@/layouts/AppLayout";

// Chaque page est chargée à la demande (un fichier JS par écran) : le premier
// affichage ne télécharge plus tout le site d'un coup — ça compte sur un
// téléphone en 4G, le cas des créatrices sur iPhone qui passent par le site.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

/** Les routes `(app)` du mobile — redirige vers /login si pas de session. */
function RequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** /login, /register — inutile de les revoir si déjà connectée. */
function RedirectIfAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuth />,
    children: [
      { path: "/login", lazy: page(() => import("@/pages/Login")) },
      { path: "/register", lazy: page(() => import("@/pages/Register")) },
    ],
  },
  { path: "/legal", lazy: page(() => import("@/pages/Legal")) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", lazy: page(() => import("@/pages/Dashboard/Dashboard")) },
          { path: "/ventes", lazy: page(() => import("@/pages/Ventes/Ventes")) },
          { path: "/creatrices", lazy: page(() => import("@/pages/Creatrices/Creatrices")) },
          { path: "/creatrices/:id", lazy: page(() => import("@/pages/Creatrices/CreatriceDetail")) },
          { path: "/creatrices/:id/articles", lazy: page(() => import("@/pages/Articles/Articles")) },
          { path: "/evenements/:id", lazy: page(() => import("@/pages/Evenements/EventFiche")) },
          { path: "/notifications", lazy: page(() => import("@/pages/Notifications/Notifications")) },
          { path: "/aide", lazy: page(() => import("@/pages/Aide/Aide")) },
          { path: "/mes-ventes/:boutiqueId", lazy: page(() => import("@/pages/Boutique/MesVentes")) },
          { path: "/stats", lazy: page(() => import("@/pages/Stats/Stats")) },
          { path: "/profil", lazy: page(() => import("@/pages/Profil/Profil")) },
          { path: "/boutiques/:id", lazy: page(() => import("@/pages/Boutique/BoutiqueDetail")) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
