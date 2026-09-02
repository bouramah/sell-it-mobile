import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import type { Boutique } from '../types'

/** Boutiques de l'utilisateur connecté (toutes si portée réseau ou administrateur — le siège
 * n'est jamais limité par une affectation de boutique_ids —, sinon ses boutique_ids). */
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
      const portee = user.role === 'administrateur' || user.boutique_ids.length === 0
      const mines = portee ? all : all.filter((b) => user.boutique_ids.includes(b.id))
      setBoutiques(mines)
      setBoutiqueId((current) => current || mines[0]?.id || '')
    })
  }, [user?.id])

  return { boutiques, boutiqueId, setBoutiqueId }
}
