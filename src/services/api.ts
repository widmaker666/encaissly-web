// Copié de encaissly-mobile/services/api.ts, nettoyé :
// - la connexion Google native (GoogleSignin) n'a pas de sens dans un
//   navigateur — remplacée par Google Identity Services (voir lib/google.ts),
//   mais `authService.googleMobile` reste tel quel : c'est le backend qui ne
//   change pas, seule la façon d'obtenir l'idToken diffère.
// - import.meta.env.VITE_* au lieu de process.env.EXPO_PUBLIC_*
// - renouvellement automatique du token sur 401 via POST /auth/refresh : le
//   mobile se contente de déconnecter, le web peut faire mieux puisque la
//   session est censée survivre au rafraîchissement de la page (persist).

import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import type { User, Role, ModePaiement, VenteListResponse } from "@/types";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

//- Injecte automatiquement le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//- Un seul appel à /auth/refresh même si plusieurs requêtes échouent en 401
//- en même temps (ex: plusieurs useQuery qui partent ensemble) — sans ça,
//- chacune déclencherait son propre refresh et invaliderait celui des autres.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) throw new Error("Pas de refresh token");
      // Instance à part (pas `api`) pour ne pas repasser par ces mêmes
      // intercepteurs et éviter une boucle si /auth/refresh répond aussi 401.
      const { data } = await axios.post<{ accessToken: string }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      useAuthStore.getState().setTokens(data.accessToken, refreshToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

//- Gère les 401 globalement : tente un renouvellement puis rejoue la requête
//- d'origine une seule fois (`_retry`) ; si ça échoue aussi, déconnexion.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !original?._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }
    if (error.response?.status === 401 && isAuthRoute) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; refreshToken: string }>("/auth/login", {
      email,
      password,
    });
    return data;
  },

  register: async (
    email: string,
    password: string,
    nom: string | undefined,
    prenom: string | undefined,
    role: Role | undefined,
    acceptedCGU: boolean,
  ) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      nom,
      prenom,
      ...(role ? { role } : {}),
      acceptedCGU,
    });
    return data;
  },

  getProfile: async () => {
    const { data } = await api.get<User>("/user/profile");
    return data;
  },

  //- Même route que le mobile (`/auth/google/mobile`) — le backend accepte
  //- déjà l'audience web (GOOGLE_CLIENT_ID), vérifié dans le plan.
  googleMobile: async (googleIdToken: string, role?: Role, acceptedCGU?: boolean) => {
    const { data } = await api.post<{ accessToken: string; refreshToken: string }>("/auth/google/mobile", {
      idToken: googleIdToken,
      ...(role ? { role } : {}),
      ...(acceptedCGU !== undefined ? { acceptedCGU } : {}),
    });
    return data;
  },
};

export type StatsParams = {
  evenementId?: string;
  boutiqueId?: string;
  mode?: "GERANTE" | "CREATRICE";
};

export const statsService = {
  getGlobal: async (params?: StatsParams) => {
    const { data } = await api.get("/stats", { params: params ?? {} });
    return data;
  },
  getHistorique: async (params?: StatsParams) => {
    const { data } = await api.get("/stats/historique", { params: params ?? {} });
    return data;
  },
  getTopArticles: async (params?: StatsParams) => {
    const { data } = await api.get("/stats/top-articles", { params: params ?? {} });
    return data;
  },
  getParCreatrice: async (mode?: "GERANTE" | "CREATRICE") => {
    const { data } = await api.get("/stats/par-creatrice", { params: mode ? { mode } : {} });
    return data;
  },
};

export const venteService = {
  getRecent: async (evenementId?: string, mode?: "GERANTE" | "CREATRICE") => {
    const { data } = await api.get("/vente/recent", {
      params: { ...(evenementId ? { evenementId } : {}), ...(mode ? { mode } : {}) },
    });
    return data;
  },
  getAll: async (filters?: {
    creatriceId?: string;
    modePaiement?: string;
    evenementId?: string;
    boutiqueId?: string;
    mode?: "GERANTE" | "CREATRICE";
    dateDebut?: string;
    dateFin?: string;
    skip?: number;
    take?: number;
  }) => {
    const { data } = await api.get<VenteListResponse>("/vente", { params: filters });
    return data;
  },
  create: async (dto: {
    nomArticle: string;
    prixVente: number;
    modePaiement: ModePaiement;
    creatriceId: string;
    evenementId?: string;
    articleId?: string;
    quantite?: number;
    sansCommission?: boolean;
  }) => {
    const { data } = await api.post("/vente", dto);
    return data;
  },
  update: async (
    id: string,
    dto: Partial<{ nomArticle: string; prixVente: number; modePaiement: ModePaiement; sansCommission: boolean }>,
  ) => {
    const { data } = await api.patch(`/vente/${id}`, dto);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/vente/${id}`);
    return data;
  },
};

export const boutiqueService = {
  getStats: async () => {
    const { data } = await api.get("/boutique/stats");
    return data;
  },
  getAvecStats: async () => {
    const { data } = await api.get("/boutique/avec-stats");
    return data;
  },
  getNbBoutiques: async () => {
    const { data } = await api.get("/boutique/mes-boutiques/count");
    return data;
  },
  getMesBoutiques: async () => {
    const { data } = await api.get("/boutique");
    return data;
  },
  creerMaBoutique: async (nom: string) => {
    const { data } = await api.post("/boutique/ma-boutique", { nom });
    return data;
  },
};

export const evenementService = {
  getAll: async (creatriceId?: string) => {
    const { data } = await api.get("/evenement", { params: creatriceId ? { creatriceId } : {} });
    return data;
  },
  creerMonEvenement: async (nom: string) => {
    const { data } = await api.post("/evenement/mon-evenement", { nom });
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/evenement/${id}`);
    return data;
  },
  create: async (dto: { nom: string; dateDebut: string; dateFin?: string; creatriceId: string }) => {
    const { data } = await api.post("/evenement", dto);
    return data;
  },
  update: async (id: string, dto: Partial<{ nom: string; dateDebut: string; dateFin?: string }>) => {
    const { data } = await api.patch(`/evenement/${id}`, dto);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/evenement/${id}`);
    return data;
  },
};

//- Import de fichier : étape 1 réécrira cette fonction (le mobile envoie
//- {uri, name, type}, le web doit envoyer un vrai File — voir le plan).
export const articleService = {
  getAll: async (params?: { creatriceId?: string; evenementId?: string }) => {
    const { data } = await api.get("/article", { params: params ?? {} });
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/article/${id}`);
    return data;
  },
  create: async (dto: {
    nom: string;
    description?: string;
    prixIndicatif?: number;
    quantite?: number;
    creatriceId?: string;
    evenementId?: string;
  }) => {
    const { data } = await api.post("/article", dto);
    return data;
  },
  update: async (
    id: string,
    dto: Partial<{ nom: string; description?: string; prixIndicatif?: number; quantite?: number }>,
  ) => {
    const { data } = await api.patch(`/article/${id}`, dto);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/article/${id}`);
    return data;
  },
  importFile: async (file: File, scope: { creatriceId?: string; evenementId?: string }) => {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams();
    if (scope.creatriceId) params.set("creatriceId", scope.creatriceId);
    if (scope.evenementId) params.set("evenementId", scope.evenementId);
    const { data } = await api.post<{ imported: number; message: string }>(
      `/article/import?${params.toString()}`,
      formData,
    );
    return data;
  },
};

export const creatriceService = {
  getAll: async () => {
    const { data } = await api.get("/creatrice");
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/creatrice/${id}`);
    return data;
  },
  create: async (dto: { nom: string; email?: string; telephone?: string; tauxDeCommission: number }) => {
    const { data } = await api.post("/creatrice", dto);
    return data;
  },
  update: async (
    id: string,
    dto: Partial<{ nom: string; email?: string; telephone?: string; tauxDeCommission: number }>,
  ) => {
    const { data } = await api.patch(`/creatrice/${id}`, dto);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/creatrice/${id}`);
    return data;
  },
  invite: async (id: string, email: string, boutiqueId: string) => {
    const { data } = await api.post(`/creatrice/${id}/invite`, { email, boutiqueId });
    return data;
  },
  acceptInvitation: async (creatriceId: string, boutiqueId: string) => {
    const { data } = await api.post(`/creatrice/${creatriceId}/accept-invitation`, { boutiqueId });
    return data;
  },
};

export const userService = {
  updateProfile: (dto: { nom?: string; prenom?: string }) => api.patch("/user/profile", dto).then((r) => r.data),
  updateNotifications: (enabled: boolean) =>
    api.patch("/user/notifications", { notificationsEmail: enabled }).then((r) => r.data),
  //- Étape 1 réécrira l'upload avatar de la même façon que l'import d'articles (vrai File).
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/user/avatar", formData);
    return data;
  },
  deleteAccount: () => api.delete("/user/account").then((r) => r.data),
};

export const stripeService = {
  //- `origin` permet au backend de nous rediriger ici après paiement plutôt
  //- que vers lui-même (voir boutique-backend@49c0760) — toujours l'origine
  //- réelle du site, jamais une valeur arbitraire.
  createCheckoutSession: async (priceId: string) => {
    const { data } = await api.post<{ url: string }>("/stripe/checkout", { priceId, origin: window.location.origin });
    return data;
  },
  cancelSubscription: async () => {
    const { data } = await api.post("/stripe/cancel");
    return data;
  },
  upgradeDuo: async () => {
    const { data } = await api.patch<User>("/user/upgrade-duo");
    return data;
  },
};

export const notificationService = {
  getAll: () => api.get("/notification").then((r) => r.data),
  getUnreadCount: () => api.get("/notification/unread-count").then((r) => r.data),
  markAllAsRead: () => api.patch("/notification/read-all").then((r) => r.data),
  markAsRead: (id: string) => api.patch(`/notification/${id}/read`).then((r) => r.data),
  clearRead: () => api.delete("/notification/read").then((r) => r.data),
};

export default api;
