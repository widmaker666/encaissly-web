// Un seul formatage de montant pour toute l'appli web.
//
// Le mobile a 9 copies de cette fonction en 3 versions qui ne donnent PAS le
// même résultat : certaines font `.toFixed(2)` (point décimal, jamais de
// séparateur de milliers : "1234.50"), d'autres `.toLocaleString("fr-FR")`
// (virgule + espace : "1 234,50"). On ne reproduit pas cette divergence ici.

const formatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Arrondit au centime pour éviter les artefacts de calcul flottant (0.1 + 0.2 …). */
export function roundMontant(n: number | null | undefined): number {
  return Math.round((n ?? 0) * 100) / 100;
}

/** "1 234,50 €" — à utiliser partout où un montant est affiché. */
export function formatMontant(n: number | null | undefined): string {
  return `${formatter.format(roundMontant(n))} €`;
}

/** "1 234,50" sans le symbole, pour les cas où le € est déjà affiché à côté (ex: dans un <input>). */
export function formatMontantSansDevise(n: number | null | undefined): string {
  return formatter.format(roundMontant(n));
}
