import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import type { Boutique } from '../types'

/** Boutiques de l'utilisateur connecté (toutes si portée réseau, sinon ses boutique_ids). */
export function useMesBoutiques() {
  const { user } = useAuth()
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [boutiqueId, setBoutiqueId] = useState<string>('')

  useEffect(() => {
    if (!user) {
      setBoutiques([])
      return
    }
    api.boutiques().then((all) => {
      const mines = user.boutique_ids.length > 0 ? all.filter((b) => user.boutique_ids.includes(b.id)) : all
      setBoutiques(mines)
      setBoutiqueId((current) => current || mines[0]?.id || '')
    })
  }, [user?.id])

  return { boutiques, boutiqueId, setBoutiqueId }
}
