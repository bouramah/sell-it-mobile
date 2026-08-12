import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { clearToken, getToken, setToken } from './auth'
import type { UtilisateurConnecte } from '../types/write'

interface AuthContextValue {
  user: UtilisateurConnecte | null
  loading: boolean
  login: (contact: string, motDePasse: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UtilisateurConnecte | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        setUser(await api.moi())
      } catch {
        await clearToken().catch(() => {})
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function login(contact: string, motDePasse: string) {
    const { access_token } = await api.login({ contact, mot_de_passe: motDePasse })
    await setToken(access_token)
    const me = await api.moi()
    setUser(me)
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
