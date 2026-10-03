import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/Login";
import ComingSoon from "@/pages/ComingSoon";

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
    children: [{ path: "/login", element: <Login /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <ComingSoon label="Tableau de bord" /> },
          { path: "/ventes", element: <ComingSoon label="Ventes" /> },
          { path: "/creatrices", element: <ComingSoon label="Créatrices" /> },
          { path: "/stats", element: <ComingSoon label="Stats" /> },
          { path: "/profil", element: <ComingSoon label="Profil" /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
