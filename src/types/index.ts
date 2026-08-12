// Sous-ensemble de web/src/types/index.ts nécessaire à l'app mobile interne.
// Dupliqué volontairement (pas de package partagé, cf. convention polyrepo) — garder en
// phase avec le web si les schémas backend changent.

export type Secteur = string
export type Role = string
export type DroitAcces = 'complet' | 'lecture_seule' | 'partiel' | 'aucun'
export type ModePaiement = 'especes' | 'mobile_money' | 'a_la_livraison' | 'credit_client' | 'virement' | 'lettre_change'
export type StatutCaisse = 'ouverte' | 'fermee' | 'ecart_signale'
export type TypeMouvementCaisse = 'encaissement' | 'decaissement'
export type CanalCommande = 'web' | 'mobile_client' | 'boutique'
export type StatutCommandeClient = 'en_attente' | 'confirmee' | 'en_preparation' | 'en_livraison' | 'livree' | 'annulee'
export type StatutLivraison = 'preparee' | 'en_cours' | 'livree' | 'echec'
export type StatutStock = 'critique' | 'a_surveiller' | 'correct'

export interface Boutique {
  id: string
  nom: string
  secteurs: Secteur[]
  quartier: string
  commune: string
  ville: string
  horaires: string
  responsable: string
  statut: string
  telephone: string
  latitude: number | null
  longitude: number | null
}

export interface Utilisateur {
  id: string
  nom: string
  prenom: string
  contact: string
  role: Role
  boutique_ids: string[]
  statut: string
  derniere_connexion: string | null
}

export interface PermissionLigne {
  module_action: string
  droits: Record<Role, DroitAcces>
}

export interface Produit {
  id: string
  nom: string
  secteur: Secteur
  categorie: string
  prix: number
  unite: string
  code_barres: string
  date_peremption: string | null
}

export interface LigneStock {
  boutique_id: string
  produit_id: string
  produit_nom: string
  secteur: Secteur
  quantite_disponible: number
  quantite_reservee: number
  seuil_alerte: number
  statut: StatutStock
  derniere_mouvement: string
}

export interface Caisse {
  id: string
  boutique_id: string
  libelle: string
  statut: StatutCaisse
  fond_initial: number
  solde_theorique: number
  solde_reel: number
  operateur: string
}

export interface LigneMouvementCaisse {
  id: string
  horodatage: string
  boutique_id: string
  caisse_libelle: string
  type: TypeMouvementCaisse
  motif: string
  operateur: string
  montant: number
}

export interface CommandeClient {
  id: string
  client_nom: string
  boutique_id: string
  canal: CanalCommande
  mode_paiement: ModePaiement
  montant: number
  statut: StatutCommandeClient
}

export interface ArticleCommande {
  id: string
  produit_id: string
  produit_nom: string
  quantite: number
  prix_unitaire: number
}

export interface CommandeClientDetail extends CommandeClient {
  articles: ArticleCommande[]
}

export interface Livraison {
  id: string
  commande_id: string
  livreur: string
  livreur_user_id: string | null
  boutique_id: string
  adresse: string
  creneau: string
  statut: StatutLivraison
  preuve_url: string | null
}

export const STATUT_LIVRAISON_LABELS: Record<StatutLivraison, string> = {
  preparee: 'Préparée',
  en_cours: 'En cours',
  livree: 'Livrée',
  echec: 'Échec',
}

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  especes: 'Espèces',
  mobile_money: 'Mobile Money',
  a_la_livraison: 'À la livraison',
  credit_client: 'Crédit client',
  virement: 'Virement',
  lettre_change: 'Lettre de change',
}
