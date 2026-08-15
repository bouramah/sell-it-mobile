import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { CommandeClientInput } from '../types/write'
import type { LigneStock, Produit } from '../types'

/**
 * Mode hors-ligne (CDC §3.7/§6.1/§8) — périmètre volontairement limité à la caisse
 * (encaissement d'une vente directe) et à la consultation du stock, tel que décidé le
 * 2026-08-15. En cas de conflit de stock détecté à la synchronisation, la vente est
 * toujours appliquée (jamais bloquée a posteriori) — c'est déjà le comportement du backend
 * (aucune vérification de suffisance de stock côté serveur), le gérant est alerté par
 * ailleurs (cf. backend/app/routers/commandes.py::appliquer_livraison_stock).
 */

const CLE_FLAG = 'offline:mode_hors_ligne'
const CLE_QUEUE = 'offline:queue:ventes'
const CLE_STOCK = (boutiqueId: string) => `offline:cache:stock:${boutiqueId}`
const CLE_PRODUITS = 'offline:cache:produits'

export interface VenteEnAttente {
  id: string
  horodatage: string
  caisseId: string
  operateur: string
  total: number
  payload: CommandeClientInput
}

async function lire<T>(cle: string, defaut: T): Promise<T> {
  try {
    const brut = await AsyncStorage.getItem(cle)
    return brut ? (JSON.parse(brut) as T) : defaut
  } catch {
    return defaut
  }
}

async function ecrire<T>(cle: string, valeur: T): Promise<void> {
  await AsyncStorage.setItem(cle, JSON.stringify(valeur))
}

/** Dernière valeur connue du paramètre "mode_hors_ligne" — mise en cache pour rester
 * disponible sans réseau (impossible d'interroger le serveur hors-ligne pour savoir si le
 * mode hors-ligne est... activé). Par défaut désactivé tant qu'on n'a jamais pu confirmer
 * l'état auprès du serveur, pour ne jamais activer une fonctionnalité non voulue par l'admin. */
export async function modeHorsLigneActif(): Promise<boolean> {
  return lire(CLE_FLAG, false)
}

export async function rafraichirModeHorsLigne(): Promise<boolean> {
  try {
    const parametres = await api.parametresApplication()
    const actif = parametres.find((p) => p.id === 'mode_hors_ligne')?.actif ?? false
    await ecrire(CLE_FLAG, actif)
    return actif
  } catch {
    return modeHorsLigneActif()
  }
}

export async function mettreEnCacheStock(boutiqueId: string, stock: LigneStock[]): Promise<void> {
  await ecrire(CLE_STOCK(boutiqueId), stock)
}

export async function stockEnCache(boutiqueId: string): Promise<LigneStock[]> {
  return lire(CLE_STOCK(boutiqueId), [])
}

export async function mettreEnCacheProduits(produits: Produit[]): Promise<void> {
  await ecrire(CLE_PRODUITS, produits)
}

export async function produitsEnCache(): Promise<Produit[]> {
  return lire(CLE_PRODUITS, [])
}

export async function ajouterVenteEnAttente(vente: Omit<VenteEnAttente, 'id' | 'horodatage'>): Promise<VenteEnAttente> {
  const queue = await lire<VenteEnAttente[]>(CLE_QUEUE, [])
  const item: VenteEnAttente = { ...vente, id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, horodatage: new Date().toISOString() }
  await ecrire(CLE_QUEUE, [...queue, item])
  return item
}

export async function ventesEnAttente(): Promise<VenteEnAttente[]> {
  return lire(CLE_QUEUE, [])
}

async function retirerDeLaQueue(id: string): Promise<void> {
  const queue = await lire<VenteEnAttente[]>(CLE_QUEUE, [])
  await ecrire(CLE_QUEUE, queue.filter((v) => v.id !== id))
}

export interface ResultatSynchronisation {
  synchronisees: number
  restantes: number
  erreur: string | null
}

/** Rejoue les ventes en attente dans l'ordre — s'arrête au premier échec réel (ex. caisse
 * entre-temps fermée) pour préserver l'ordre et ne pas perdre la vente en erreur ; un
 * éventuel conflit de stock, lui, n'est jamais bloquant côté serveur (cf. en-tête du fichier). */
export async function synchroniserVentes(): Promise<ResultatSynchronisation> {
  const queue = await lire<VenteEnAttente[]>(CLE_QUEUE, [])
  let synchronisees = 0
  for (const vente of queue) {
    try {
      const commande = await api.creerCommandeClient(vente.payload)
      if (commande.remise_statut !== 'en_attente') {
        await api.modifierStatutCommandeClient(commande.id, 'livree')
        await api.creerMouvementCaisse({
          caisse_id: vente.caisseId, type: 'encaissement',
          motif: `Vente directe (synchronisée) — #${commande.id}`, operateur: vente.operateur, montant: vente.total,
        })
      }
      await retirerDeLaQueue(vente.id)
      synchronisees += 1
    } catch (e) {
      return {
        synchronisees,
        restantes: queue.length - synchronisees,
        erreur: e instanceof Error && e.message ? e.message : 'Échec de synchronisation.',
      }
    }
  }
  return { synchronisees, restantes: 0, erreur: null }
}

/** true si l'appareil est connecté ET peut effectivement joindre internet (state.isInternetReachable
 * peut être null juste après un changement — traité comme "on ne sait pas encore", pas comme hors-ligne). */
export function useConnectivite(): boolean {
  const [connecte, setConnecte] = useState(true)
  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setConnecte(state.isConnected !== false && state.isInternetReachable !== false)
    })
    return () => sub()
  }, [])
  return connecte
}
