// Copie exacte de encaissly-mobile/types/index.ts — les deux apps tapent sur
// le même backend, ce fichier doit rester identique des deux côtés.

export type Plan = "FREE" | "PRO" | "DUO";
export type Role = "GERANTE" | "CREATRICE" | "GERANTE_CREATRICE";
export type Status = "ACTIVE" | "INVITE" | "SUSPENDUE";
export type ModePaiement = "ESPECES" | "CARTE";

export interface User {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
  plan: Plan;
  role: Role;
  notificationsEmail: boolean;
  lastExportData: string | null;
  createdAt: string;
  avatar?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Creatrice {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  tauxDeCommission: number;
  createdAt: string;
  userId?: string;
  nbVentes?: number;
  ca?: number;
}

export interface Vente {
  id: string;
  photo?: string;
  nomArticle: string;
  prixVente: number;
  modePaiement: ModePaiement;
  creatriceId: string;
  boutiqueId?: string;
  createdAt: string;
  creatrice?: Pick<Creatrice, "nom" | "tauxDeCommission">;
  evenement?: { nom: string } | null;
  montantCommission: number;
  netCreatrice: number;
  quantite?: number;
  sansCommission?: boolean;
}

export interface VenteListResponse {
  data: Vente[];
  total: number;
  hasMore: boolean;
}

export interface Boutique {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  createdAt: string;
  geranteId: string;
}

export interface VenteDetail {
  id: string;
  nomArticle: string;
  prixVente: number;
  modePaiement: ModePaiement;
  createdAt: string;
}

export interface CreatriceStats {
  nbVentes: number;
  ca: number;
  totalCommission: number;
  netCreatrice: number;
}

export interface CreatriceDetail extends Creatrice {
  ventes: VenteDetail[];
  stats: CreatriceStats;
}

export interface Article {
  id: string;
  nom: string;
  description?: string;
  prixIndicatif?: number;
  quantite?: number;
  photo?: string;
  createdAt: string;
  creatriceId: string;
}
