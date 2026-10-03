/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_STRIPE_PRICE_PRO_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_PRO_ANNUAL?: string;
  readonly VITE_STRIPE_PRICE_DUO_MONTHLY?: string;
  readonly VITE_STRIPE_PRICE_DUO_ANNUAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
