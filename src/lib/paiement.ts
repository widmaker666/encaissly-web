import type { ModePaiement } from "@/types";

/** Libellés lisibles des modes de paiement (la valeur technique reste ESPECES / CARTE). */
export const MODE_LABEL: Record<ModePaiement, string> = {
  ESPECES: "Espèces",
  CARTE: "Carte",
};
