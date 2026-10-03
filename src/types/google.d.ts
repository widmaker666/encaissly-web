// Sous-ensemble minimal de Google Identity Services (GIS) utilisé ici — pas
// de @types officiel pour cette lib, donc on déclare juste ce dont on se sert.
// Doc : https://developers.google.com/identity/gsi/web/reference/js-reference

interface GoogleCredentialResponse {
  credential: string; // JWT ID token
  select_by?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
        renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        prompt?: () => void;
      };
    };
  };
}
