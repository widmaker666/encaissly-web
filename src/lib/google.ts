// Chargement paresseux du script Google Identity Services — évite de le
// mettre en dur dans index.html (ça bloquerait le premier rendu sur une
// ressource tierce pour des pages qui n'en ont pas besoin, ex: /ventes).

let loadPromise: Promise<void> | null = null;

export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Impossible de charger Google Identity Services."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
