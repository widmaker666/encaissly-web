import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Legal from "@/pages/Legal";
import Dashboard from "@/pages/Dashboard/Dashboard";
import Ventes from "@/pages/Ventes/Ventes";
import Creatrices from "@/pages/Creatrices/Creatrices";
import CreatriceDetail from "@/pages/Creatrices/CreatriceDetail";
import Stats from "@/pages/Stats/Stats";
import Profil from "@/pages/Profil/Profil";
import BoutiqueDetail from "@/pages/Boutique/BoutiqueDetail";
import Articles from "@/pages/Articles/Articles";
import EventFiche from "@/pages/Evenements/EventFiche";
import Notifications from "@/pages/Notifications/Notifications";
import Aide from "@/pages/Aide/Aide";
import MesVentes from "@/pages/Boutique/MesVentes";

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
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
    ],
  },
  { path: "/legal", element: <Legal /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Dashboard /> },
          { path: "/ventes", element: <Ventes /> },
          { path: "/creatrices", element: <Creatrices /> },
          { path: "/creatrices/:id", element: <CreatriceDetail /> },
          { path: "/creatrices/:id/articles", element: <Articles /> },
          { path: "/evenements/:id", element: <EventFiche /> },
          { path: "/notifications", element: <Notifications /> },
          { path: "/aide", element: <Aide /> },
          { path: "/mes-ventes/:boutiqueId", element: <MesVentes /> },
          { path: "/stats", element: <Stats /> },
          { path: "/profil", element: <Profil /> },
          { path: "/boutiques/:id", element: <BoutiqueDetail /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
