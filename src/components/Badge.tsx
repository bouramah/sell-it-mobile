import { StyleSheet, Text, View } from 'react-native'
import { colors, font } from '../lib/theme'

export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  default: { bg: '#eeece9', fg: colors.inkMuted2 },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  info: { bg: colors.tealLight, fg: colors.tealDark },
}

export default function Badge({ label, tone = 'default' }: { label: string; tone?: BadgeTone }) {
  const t = TONE_STYLES[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { ...font.badge },
})
