// Placeholder pour les écrans pas encore écrits — remplacé page par page
// pendant l'étape 1. Évite des routes qui plantent en attendant.
export default function ComingSoon({ label }: { label: string }) {
  return (
    <div>
      <h2>{label}</h2>
      <p style={{ color: "var(--color-text-light)" }}>Écran à venir.</p>
    </div>
  );
}
