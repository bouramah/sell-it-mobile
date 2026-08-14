import { clearToken, getToken } from '../lib/auth'
import type {
  Boutique,
  Caisse,
  Client,
  CommandeClient,
  CommandeClientDetail,
  LigneDette,
  LigneMouvementCaisse,
  LigneStock,
  Livraison,
  PermissionLigne,
  Produit,
  TransfertStock,
  Utilisateur,
} from '../types'
import type {
  CaisseInput,
  CommandeClientInput,
  LivraisonInput,
  LoginRequest,
  MouvementCaisseInput,
  RemboursementInput,
  TokenResponse,
  UtilisateurConnecte,
} from '../types/write'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000/api/v1'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// FastAPI renvoie `detail` en string pour les erreurs métier (400/403/404/409…) mais en
// tableau d'objets {msg, loc, type} pour les erreurs de validation (422) — sans ce
// formatage, une 422 affichait "[object Object]" à l'utilisateur au lieu du vrai message.
function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e === 'object' && 'msg' in e ? String((e as { msg: unknown }).msg) : JSON.stringify(e)))
      .join(' ; ')
  }
  return ''
}

// Déclenché sur un 401 en cours de session (token expiré/révoqué) — enregistré par
// AuthContext au démarrage. Sans ça, un jeton qui expire pendant l'utilisation laisse
// l'appli dans un état cassé (listes vides, échecs silencieux) sans jamais redemander
// la connexion — même bug que celui corrigé côté web (session expirée non détectée).
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function handle<T>(res: Response, path: string): Promise<T> {
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = formatDetail(body.detail)
    } catch {
      // ignore
    }
    if (res.status === 401) {
      await clearToken().catch(() => {})
      onUnauthorized?.()
    }
    throw new ApiError(res.status, detail || `Erreur API ${res.status} sur ${path}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: await authHeaders() })
  return handle<T>(res, path)
}

async function sendJson<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handle<T>(res, path)
}

async function sendFile<T>(path: string, fileUri: string, fileName: string, mimeType: string): Promise<T> {
  const formData = new FormData()
  // React Native's fetch accepts this object shape for a file field — not the DOM File type.
  formData.append('file', { uri: fileUri, name: fileName, type: mimeType } as unknown as Blob)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: formData,
  })
  return handle<T>(res, path)
}

export const api = {
  login: (payload: LoginRequest) => sendJson<TokenResponse>('POST', '/auth/login', payload),
  moi: () => getJson<UtilisateurConnecte>('/auth/moi'),
  motDePasseOublie: (contact: string) => sendJson<{ message: string }>('POST', '/auth/mot-de-passe-oublie', { contact }),
  reinitialiserMotDePasse: (contact: string, code: string, nouveauMotDePasse: string) =>
    sendJson<{ message: string }>('POST', '/auth/reinitialiser-mot-de-passe', { contact, code, nouveau_mot_de_passe: nouveauMotDePasse }),
  enregistrerPushToken: (pushToken: string | null) => sendJson<{ message: string }>('PUT', '/auth/moi/push-token', { push_token: pushToken }),
  changerMotDePasse: (motDePasseActuel: string, nouveauMotDePasse: string) =>
    sendJson<{ message: string }>('PUT', '/auth/moi/mot-de-passe', { mot_de_passe_actuel: motDePasseActuel, nouveau_mot_de_passe: nouveauMotDePasse }),

  permissions: () => getJson<PermissionLigne[]>('/permissions'),

  boutiques: () => getJson<Boutique[]>('/boutiques'),
  utilisateurs: (boutiqueId?: string) => getJson<Utilisateur[]>(`/utilisateurs${boutiqueId ? `?boutique_id=${boutiqueId}` : ''}`),

  stock: (boutiqueId?: string) => getJson<LigneStock[]>(`/stock${boutiqueId ? `?boutique_id=${boutiqueId}` : ''}`),
  produits: (q?: string) => getJson<Produit[]>(`/produits${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  clients: (boutiqueId?: string) => getJson<Client[]>(`/clients${boutiqueId ? `?boutique_id=${boutiqueId}` : ''}`),

  caisses: (boutiqueId?: string) => getJson<Caisse[]>(`/caisse/caisses${boutiqueId ? `?boutique_id=${boutiqueId}` : ''}`),
  creerCaisse: (payload: CaisseInput) => sendJson<Caisse>('POST', '/caisse/caisses', payload),
  fermerCaisse: (id: string, soldeReel: number) => sendJson<Caisse>('POST', `/caisse/caisses/${id}/fermer`, { solde_reel: soldeReel }),
  rouvrirCaisse: (id: string) => sendJson<Caisse>('POST', `/caisse/caisses/${id}/rouvrir`),
  mouvementsCaisse: (boutiqueId?: string) => getJson<LigneMouvementCaisse[]>(`/caisse/mouvements${boutiqueId ? `?boutique_id=${boutiqueId}` : ''}`),
  creerMouvementCaisse: (payload: MouvementCaisseInput) => sendJson<LigneMouvementCaisse>('POST', '/caisse/mouvements', payload),

  commandesClients: (boutiqueId?: string) => getJson<CommandeClient[]>(`/commandes-clients${boutiqueId ? `?boutique_id=${boutiqueId}` : ''}`),
  commandeClient: (id: string) => getJson<CommandeClientDetail>(`/commandes-clients/${id}`),
  creerCommandeClient: (payload: CommandeClientInput) => sendJson<CommandeClientDetail>('POST', '/commandes-clients', payload),
  modifierStatutCommandeClient: (id: string, statut: string) => sendJson<CommandeClient>('PUT', `/commandes-clients/${id}`, { statut }),
  validerRemiseCommandeClient: (id: string) => sendJson<CommandeClientDetail>('PUT', `/commandes-clients/${id}/valider-remise`),

  dettes: (tiersType: 'client' | 'fournisseur' = 'client', boutiqueId?: string) =>
    getJson<LigneDette[]>(`/dettes?tiers_type=${tiersType}${boutiqueId ? `&boutique_id=${boutiqueId}` : ''}`),
  encaisserRemboursement: (detteId: string, payload: RemboursementInput) =>
    sendJson<LigneDette>('POST', `/dettes/${detteId}/remboursements`, payload),

  transferts: () => getJson<TransfertStock[]>('/transferts'),
  modifierStatutTransfert: (id: string, statut: string, quantiteRecue?: number, motifEcart?: string) =>
    sendJson<TransfertStock>('PUT', `/transferts/${id}/statut`, { statut, quantite_recue: quantiteRecue, motif_ecart: motifEcart }),

  livraisons: (params?: { boutiqueId?: string; mine?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.boutiqueId) qs.set('boutique_id', params.boutiqueId)
    if (params?.mine) qs.set('mine', 'true')
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return getJson<Livraison[]>(`/livraisons${suffix}`)
  },
  creerLivraison: (payload: LivraisonInput) => sendJson<Livraison>('POST', '/livraisons', payload),
  modifierStatutLivraison: (id: string, statut: string) => sendJson<Livraison>('PUT', `/livraisons/${id}/statut`, { statut }),
  uploaderPreuveLivraison: (id: string, fileUri: string, fileName: string, mimeType: string) =>
    sendFile<Livraison>(`/livraisons/${id}/preuve`, fileUri, fileName, mimeType),
}

export { ApiError }
