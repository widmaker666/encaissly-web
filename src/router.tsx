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
          { path: "/stats", element: <Stats /> },
          { path: "/profil", element: <Profil /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
