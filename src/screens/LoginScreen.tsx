import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import TextField from '../components/TextField'
import { useAuth } from '../lib/AuthContext'
import { colors, spacing } from '../lib/theme'

export default function LoginScreen() {
  const { login } = useAuth()
  const [contact, setContact] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!contact || !motDePasse) {
      setError('Renseignez votre numéro et votre mot de passe.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login(contact, motDePasse)
    } catch {
      setError('Numéro ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>K</Text>
        </View>
        <Text style={styles.title}>KFSTORE</Text>
        <Text style={styles.subtitle}>Accès réservé au personnel GROUPE SKF SARL</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Numéro de téléphone"
          value={contact}
          onChangeText={setContact}
          placeholder="622 00 00 00"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <TextField label="Mot de passe" value={motDePasse} onChangeText={setMotDePasse} secureTextEntry autoCapitalize="none" />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Se connecter" onPress={handleSubmit} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate50, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl * 1.5 },
  brand: { alignItems: 'center', gap: spacing.xs },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.teal700, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  logoText: { color: colors.white, fontSize: 24, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800', color: colors.slate900 },
  subtitle: { fontSize: 13, color: colors.slate500, textAlign: 'center' },
  form: { gap: spacing.md },
  error: { color: colors.red600, fontSize: 13 },
})
