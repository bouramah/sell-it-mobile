import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../lib/theme'

interface ScreenProps {
  children: ReactNode
  scroll?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

export default function Screen({ children, scroll = true, onRefresh, refreshing }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal700} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flexContent}>{children}</View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },
  flexContent: { flex: 1, padding: spacing.lg },
})
