import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../lib/theme'

interface Props {
  connecte: boolean
  enAttente: number
  synchronisation: boolean
  onSynchroniser: () => void
}

export default function OfflineBanner({ connecte, enAttente, synchronisation, onSynchroniser }: Props) {
  if (connecte && enAttente === 0) return null

  return (
    <View style={styles.wrap}>
      <Ionicons name={connecte ? 'sync' : 'cloud-offline'} size={16} color={colors.warning} />
      <Text style={styles.text}>
        {connecte
          ? `${enAttente} vente${enAttente > 1 ? 's' : ''} en attente de synchronisation`
          : enAttente > 0
            ? `Hors-ligne — ${enAttente} vente${enAttente > 1 ? 's' : ''} en attente`
            : 'Hors-ligne — mode dégradé actif pour la caisse'}
      </Text>
      {connecte && enAttente > 0 && (
        <Pressable onPress={onSynchroniser} disabled={synchronisation} style={styles.bouton}>
          {synchronisation ? <ActivityIndicator size="small" color={colors.tealDark} /> : <Text style={styles.boutonText}>Synchroniser</Text>}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  text: { flex: 1, fontSize: 12.5, color: colors.warning },
  bouton: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  boutonText: { fontSize: 12, fontWeight: '700', color: colors.tealDark },
})
