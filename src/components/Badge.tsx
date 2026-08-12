import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../lib/theme'

type Tone = 'default' | 'success' | 'warning' | 'danger'

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: colors.slate100, fg: colors.slate600 },
  success: { bg: colors.emeraldBg, fg: colors.emerald600 },
  warning: { bg: colors.amberBg, fg: '#92400e' },
  danger: { bg: colors.redBg, fg: colors.red600 },
}

export default function Badge({ label, tone = 'default' }: { label: string; tone?: Tone }) {
  const t = TONE_STYLES[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
})
