// Règles de rôle et de plan — un seul endroit, pour ne pas reproduire le bug
// du mobile : 8 copies du calcul "suis-je en vue gérante ?" dont 2 variantes
// (fiche créatrice, catalogue d'articles) qui ignorent le mode en cours
// (`duoMode`) et traitent un compte DUO comme gérante en permanence, même
// quand il a basculé en vue créatrice. La version ci-dessous est la version
// correcte (= celle du dashboard mobile), à utiliser partout.

import type { User } from "@/types";

export type DuoMode = "GERANTE" | "CREATRICE";

/** Un compte GERANTE_CREATRICE (abonnement DUO) peut basculer entre les deux vues. */
export function isDuo(user: User | null | undefined): boolean {
  return user?.role === "GERANTE_CREATRICE";
}

/**
 * Vue actuellement affichée gérante ou non.
 * Pour un compte DUO, dépend de `duoMode` (bascule 100% côté client,
 * jamais déductible du rôle stocké seul) — ne JAMAIS l'omettre.
 */
export function isGerante(user: User | null | undefined, duoMode: DuoMode): boolean {
  return user?.role === "GERANTE" || (isDuo(user) && duoMode === "GERANTE");
}

/** DUO ouvre tout ce que PRO ouvre (voir project_export_rules) — toujours vérifier les deux. */
export function isPro(user: User | null | undefined): boolean {
  return user?.plan === "PRO" || user?.plan === "DUO";
}

/** Limites du plan FREE, en un seul endroit (1 boutique, 1 mois d'historique, 3 créatrices max). */
export const FREE_LIMITS = {
  maxBoutiques: 1,
  historiqueMois: 1,
  maxCreatrices: 3,
} as const;
