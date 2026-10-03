// Un seul endroit pour le formatage des dates — le mobile a 6 copies de ce
// genre de fonction, toutes sur la même locale fr-FR mais avec des options
// différentes selon l'écran. On garde la même idée (une fonction par usage)
// mais à un seul endroit.

/** "27 sept. 2026" */
export function formatDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/** "27 septembre 2026" */
export function formatDateLong(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** "septembre 2026" — pour les en-têtes de mois (dashboard, stats, exports). */
export function formatMonthYear(iso: string | Date = new Date()): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** "27/09/2026 14:32" */
export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
