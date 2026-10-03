// Même store que le mobile, + persistance (localStorage) : sur le web on
// veut rester connecté après un rafraîchissement de page, contrairement au
// mobile qui perd tout au redémarrage (pas de SecureStore côté mobile).
//
// ⚠️ La doc Zustand prévient que `persist` ne valide pas ce qu'il relit du
// localStorage (contenu modifié à la main, version d'un ancien schéma...).
// On ne stocke donc que le strict nécessaire (tokens + profil + duoMode) et
// `onRehydrateStorage` vérifie la forme minimale au démarrage ; si c'est
// abîmé, on déconnecte proprement plutôt que de planter l'appli.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

export type DuoMode = "GERANTE" | "CREATRICE";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  activeEvenementId: string | null;
  activeEvenementNom: string | null;
  duoMode: DuoMode;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setActiveEvenement: (id: string | null, nom: string | null) => void;
  setDuoMode: (mode: DuoMode) => void;
  logout: () => void;
}

const initialState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  activeEvenementId: null,
  activeEvenementNom: null,
  duoMode: "GERANTE" as DuoMode,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setActiveEvenement: (id, nom) => set({ activeEvenementId: id, activeEvenementNom: nom }),
      setDuoMode: (mode) => set({ duoMode: mode }),
      logout: () => set({ ...initialState }),
    }),
    {
      name: "encaissly-auth",
      // Forme attendue vérifiée à la relecture — un localStorage trafiqué ou
      // issu d'une vieille version du schéma ne doit pas planter l'appli.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const tokensLookValid =
          (state.accessToken === null || typeof state.accessToken === "string") &&
          (state.refreshToken === null || typeof state.refreshToken === "string");
        if (!tokensLookValid) {
          state.logout();
        }
      },
    },
  ),
);
