import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../api/client'
import { clearToken, getToken, setToken } from './auth'
import { desinscrirePushToken, enregistrerPushToken } from './push'
import type { UtilisateurConnecte } from '../types/write'

interface AuthContextValue {
  user: UtilisateurConnecte | null
  loading: boolean
  // Renvoie otpRequis=true si la 2FA est exigée pour ce compte — dans ce cas la connexion
  // n'est pas encore effective, il faut appeler verifier2FA(contact, code) pour la terminer.
  login: (contact: string, motDePasse: string) => Promise<{ otpRequis: boolean }>
  verifier2FA: (contact: string, code: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UtilisateurConnecte | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sur une session déjà expirée côté serveur, la requête client.ts déclenche déjà ce
    // même handler (via setUnauthorizedHandler) — l'enregistrer tôt garantit qu'aucun 401
    // ultérieur, à n'importe quel écran, ne laisse l'appli dans un état incohérent.
    setUnauthorizedHandler(() => setUser(null))
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        setUser(await api.moi())
        enregistrerPushToken()
      } catch {
        await clearToken().catch(() => {})
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function login(contact: string, motDePasse: string) {
    const { otp_requis, access_token } = await api.login({ contact, mot_de_passe: motDePasse })
    if (otp_requis || !access_token) return { otpRequis: true }
    await setToken(access_token)
    const me = await api.moi()
    setUser(me)
    enregistrerPushToken()
    return { otpRequis: false }
  }

  async function verifier2FA(contact: string, code: string) {
    const { access_token } = await api.verifier2FA({ contact, code })
    if (!access_token) throw new Error('Code invalide ou expiré')
    await setToken(access_token)
    const me = await api.moi()
    setUser(me)
    enregistrerPushToken()
  }

  async function logout() {
    // Le token push doit être effacé côté serveur avant qu'on efface le jeton d'accès local
    // (l'appel a besoin d'être encore authentifié) — d'où l'ordre séquentiel ici.
    await desinscrirePushToken()
    await clearToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, verifier2FA, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
