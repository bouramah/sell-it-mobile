import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../lib/theme'

interface ListRowProps {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  danger?: boolean
}

export default function ListRow({ title, subtitle, icon, onPress, danger }: ListRowProps) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.tealDark} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, danger && { color: colors.danger }]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.7 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  iconWrapDanger: { backgroundColor: colors.dangerBg },
  texts: { gap: 2, flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 12.5, color: colors.inkMuted },
})
