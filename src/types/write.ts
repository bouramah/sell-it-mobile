import type { CanalCommande, ModePaiement, PalierPrix, Role, StatutCommandeClient, TypeMouvementCaisse } from './index'

export interface LoginRequest {
  contact: string
  mot_de_passe: string
}

export interface TokenResponse {
  // otp_requis=true : mot de passe correct mais 2FA obligatoire pour ce rôle — access_token
  // est alors absent, il faut appeler api.verifier2FA(contact, code) pour obtenir le token.
  otp_requis: boolean
  access_token: string | null
  token_type: string
}

export interface Verifier2FARequest {
  contact: string
  code: string
}

export interface UtilisateurConnecte {
  id: string
  nom: string
  prenom: string
  contact: string
  role: Role
  boutique_ids: string[]
}

export interface CaisseInput {
  boutique_id: string
  libelle: string
  fond_initial: number
  operateur: string
}

export interface MouvementCaisseInput {
  caisse_id: string
  type: TypeMouvementCaisse
  motif: string
  operateur: string
  montant: number
}

export interface ArticleCommandeInput {
  produit_id: string
  quantite: number
  palier?: PalierPrix
  prix_unitaire?: number | null
}

export interface CommandeClientInput {
  client_nom: string
  boutique_id: string
  canal: CanalCommande
  mode_paiement: ModePaiement
  statut: StatutCommandeClient
  articles: ArticleCommandeInput[]
  remise_motif?: string | null
}

export interface LivraisonInput {
  commande_id: string
  livreur: string
  livreur_user_id?: string | null
  boutique_id: string
  adresse: string
  creneau: string
}

export interface RemboursementInput {
  caisse_id: string
  montant: number
  mode_paiement: ModePaiement
  operateur: string
}
