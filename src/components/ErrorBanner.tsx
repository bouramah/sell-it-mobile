import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../lib/theme'

export default function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  text: { flex: 1, fontSize: 12.5, color: colors.danger },
})
