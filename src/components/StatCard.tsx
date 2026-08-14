import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../lib/theme'

interface StatCardProps {
  label: string
  value: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: string
}

export default function StatCard({ label, value, icon, color = colors.teal }: StatCardProps) {
  return (
    <View style={styles.card}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: `${color}1a` }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
      )}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  label: { ...font.statLabel },
  value: { ...font.statValue },
})
