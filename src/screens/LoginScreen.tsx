import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { api } from '../api/client'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../lib/AuthContext'
import { colors, spacing } from '../lib/theme'

type Vue = 'connexion' | 'verification-2fa' | 'demande-code' | 'reinitialisation'

export default function LoginScreen() {
  const { login, verifier2FA } = useAuth()
  const [vue, setVue] = useState<Vue>('connexion')

  const [contact, setContact] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [code2FA, setCode2FA] = useState('')

  const [resetContact, setResetContact] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit() {
    if (!contact || !motDePasse) {
      setError('Renseignez votre numéro et votre mot de passe.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { otpRequis } = await login(contact, motDePasse)
      if (otpRequis) setVue('verification-2fa')
    } catch {
      setError('Numéro ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifier2FA() {
    if (!code2FA) {
      setError('Renseignez le code reçu par SMS.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await verifier2FA(contact, code2FA)
    } catch {
      setError('Code invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  function ouvrirMotDePasseOublie() {
    setError(null)
    setInfo(null)
    setResetContact(contact)
    setVue('demande-code')
  }

  async function handleDemandeCode() {
    if (!resetContact) {
      setError('Renseignez votre numéro de téléphone.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { message } = await api.motDePasseOublie(resetContact)
      setInfo(message)
      setVue('reinitialisation')
    } catch {
      setError("Impossible d'envoyer le code pour le moment.")
    } finally {
      setLoading(false)
    }
  }

  async function handleReinitialisation() {
    if (!resetCode || !nouveauMotDePasse) {
      setError('Renseignez le code reçu et le nouveau mot de passe.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.reinitialiserMotDePasse(resetContact, resetCode, nouveauMotDePasse)
      setInfo('Mot de passe réinitialisé. Vous pouvez vous connecter.')
      setVue('connexion')
      setContact(resetContact)
      setMotDePasse('')
      setResetCode('')
      setNouveauMotDePasse('')
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Code invalide ou expiré.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Image source={require('../../assets/logo.jpeg')} style={styles.logo} resizeMode="contain" />

      {vue === 'connexion' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Application interne — vendeurs, caissiers, livreurs</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Numéro de téléphone"
              value={contact}
              onChangeText={setContact}
              placeholder="620 00 00 00"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <TextField label="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoCapitalize="none" placeholder="••••••••" />
            <Pressable style={styles.forgot} onPress={ouvrirMotDePasseOublie}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Pressable>
            {info && <Text style={styles.info}>{info}</Text>}
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Se connecter" onPress={handleSubmit} loading={loading} />
          </View>
        </>
      )}

      {vue === 'verification-2fa' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Vérification en deux étapes</Text>
            <Text style={styles.subtitle}>Un code de vérification vous a été envoyé par SMS au {contact}.</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Code reçu par SMS"
              value={code2FA}
              onChangeText={setCode2FA}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Valider" onPress={handleVerifier2FA} loading={loading} />
            <Pressable
              style={styles.forgot}
              onPress={() => {
                setError(null)
                setCode2FA('')
                setVue('connexion')
              }}
            >
              <Text style={styles.forgotText}>Retour à la connexion</Text>
            </Pressable>
          </View>
        </>
      )}

      {vue === 'demande-code' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>Un code de vérification à usage unique vous sera envoyé par SMS.</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Numéro de téléphone"
              value={resetContact}
              onChangeText={setResetContact}
              placeholder="620 00 00 00"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Recevoir le code par SMS" onPress={handleDemandeCode} loading={loading} />
            <Pressable
              style={styles.forgot}
              onPress={() => {
                setError(null)
                setVue('connexion')
              }}
            >
              <Text style={styles.forgotText}>Retour à la connexion</Text>
            </Pressable>
          </View>
        </>
      )}

      {vue === 'reinitialisation' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            {info && <Text style={styles.subtitle}>{info}</Text>}
          </View>

          <View style={styles.form}>
            <TextField label="Code reçu par SMS" value={resetCode} onChangeText={setResetCode} placeholder="123456" keyboardType="number-pad" autoCapitalize="none" />
            <TextField
              label="Nouveau mot de passe"
              value={nouveauMotDePasse}
              onChangeText={setNouveauMotDePasse}
              secureTextEntry
              autoCapitalize="none"
              placeholder="••••••••"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Réinitialiser le mot de passe" onPress={handleReinitialisation} loading={loading} />
            <Pressable
              style={styles.forgot}
              onPress={() => {
                setError(null)
                setVue('demande-code')
              }}
            >
              <Text style={styles.forgotText}>Je n'ai pas reçu le code</Text>
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  logo: { width: 160, height: 47 },
  header: { gap: 6 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  form: { gap: spacing.md },
  forgot: { alignSelf: 'flex-end' },
  forgotText: { color: colors.teal, fontSize: 13, fontWeight: '600' },
  info: { color: colors.tealDark, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
})
