import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button'
import Card from '../components/Card'
import Screen from '../components/Screen'
import { useAuth } from '../lib/AuthContext'
import { colors, spacing } from '../lib/theme'

export default function ProfilScreen() {
  const { user, logout } = useAuth()

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.nom}>{user ? `${user.prenom} ${user.nom}` : '—'}</Text>
        <Text style={styles.meta}>{user?.contact}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </Card>
      <Button label="Déconnexion" variant="danger" onPress={logout} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  nom: { fontSize: 17, fontWeight: '700', color: colors.slate900 },
  meta: { fontSize: 13, color: colors.slate500 },
  role: { fontSize: 12, color: colors.teal700, fontWeight: '600', textTransform: 'capitalize' },
})
