import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import { MODULE_ACTIONS } from './moduleActions'
import type { PermissionLigne, Role } from '../types'

/**
 * Miroir de web/src/lib/permissions.tsx — même matrice de droits (/permissions),
 * même logique de contournement administrateur. Le backend reste la frontière de
 * sécurité réelle ; ceci ne sert qu'à masquer les actions non autorisées côté mobile.
 */

const PermissionsContext = createContext<PermissionLigne[]>([])

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [matrix, setMatrix] = useState<PermissionLigne[]>([])

  useEffect(() => {
    if (!user) {
      setMatrix([])
      return
    }
    api.permissions().then(setMatrix).catch(() => setMatrix([]))
  }, [user?.id])

  return <PermissionsContext.Provider value={matrix}>{children}</PermissionsContext.Provider>
}

function hasAccess(matrix: PermissionLigne[], role: Role | null, ...moduleActions: string[]): boolean {
  if (!role) return false
  if (role === 'administrateur') return true
  return moduleActions.some((action) => {
    const row = matrix.find((r) => r.module_action === action)
    return row ? row.droits[role] !== 'aucun' : false
  })
}

export interface Permissions {
  role: Role | null
  stockLecture: boolean
  /** Visibilité de l'onglet Caisse : vente directe OU gestion de caisse (ouverture/mouvement). */
  caisseGestion: boolean
  venteDirecte: boolean
  caisseOuverture: boolean
  caisseMouvement: boolean
  commandeClient: boolean
  livraisonGestion: boolean
  detteRemboursement: boolean
  transfertReception: boolean
  remiseValidation: boolean
}

export function usePermissions(): Permissions {
  const { user } = useAuth()
  const matrix = useContext(PermissionsContext)
  const role = user?.role ?? null
  const has = (...actions: string[]) => hasAccess(matrix, role, ...actions)

  const venteDirecte = has(MODULE_ACTIONS.VENTE_DIRECTE)
  const caisseOuverture = has(MODULE_ACTIONS.CAISSE_OUVERTURE)
  const caisseMouvement = has(MODULE_ACTIONS.CAISSE_MOUVEMENT)

  return {
    role,
    stockLecture: true, // consultation stock non gatée par la matrice, cf. scoping boutique
    caisseGestion: venteDirecte || caisseOuverture || caisseMouvement,
    venteDirecte,
    caisseOuverture,
    caisseMouvement,
    commandeClient: has(MODULE_ACTIONS.COMMANDE_CLIENT),
    livraisonGestion: has(MODULE_ACTIONS.LIVRAISON_GESTION),
    detteRemboursement: has(MODULE_ACTIONS.DETTE_REMBOURSEMENT),
    transfertReception: has(MODULE_ACTIONS.TRANSFERT_RECEPTION),
    remiseValidation: has(MODULE_ACTIONS.REMISE_VALIDATION),
  }
}
