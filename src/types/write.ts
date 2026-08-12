import type { CanalCommande, ModePaiement, Role, StatutCommandeClient, TypeMouvementCaisse } from './index'

export interface LoginRequest {
  contact: string
  mot_de_passe: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
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
  prix_unitaire?: number | null
}

export interface CommandeClientInput {
  client_nom: string
  boutique_id: string
  canal: CanalCommande
  mode_paiement: ModePaiement
  statut: StatutCommandeClient
  articles: ArticleCommandeInput[]
}

export interface LivraisonInput {
  commande_id: string
  livreur: string
  livreur_user_id?: string | null
  boutique_id: string
  adresse: string
  creneau: string
}
