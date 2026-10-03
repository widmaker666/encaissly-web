// Équivalent web de encaissly-mobile/services/download.ts (downloadAndShare) —
// même API backend, mais un navigateur n'a ni dossier de documents ni feuille
// de partage : on récupère le fichier en blob puis on déclenche le
// téléchargement navigateur classique (lien <a download> éphémère).

import { API_BASE_URL } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// Message clair selon la raison du refus (le backend renvoie 403/404/400)
function messageErreur(status: number): string {
  if (status === 403) return "Cette fonction n'est pas disponible avec ta formule.";
  if (status === 404) return "Boutique ou créatrice introuvable.";
  if (status === 400) return "Période invalide.";
  return "Impossible de générer le document.";
}

/**
 * Télécharge un document généré par le backend et déclenche son
 * enregistrement par le navigateur. Aucune limite de nombre : relançable à
 * volonté. `path` est relatif à l'API (ex. "/export/pdf/ventes?mois=2026-09").
 * Retourne true si le téléchargement a bien démarré.
 */
export async function downloadFile(path: string, filename: string): Promise<boolean> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return false;
  const ext = filename.split(".").pop() ?? "pdf";

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      alert(messageErreur(response.status));
      return false;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(new Blob([blob], { type: MIME[ext] ?? "application/octet-stream" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Laisse le temps au navigateur de démarrer le téléchargement avant de libérer l'URL.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    alert("Une erreur est survenue lors du téléchargement.");
    return false;
  }
}
