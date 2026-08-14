import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ListRow from '../components/ListRow'
import Screen from '../components/Screen'
import DettesScreen from './DettesScreen'
import LivraisonsScreen from './LivraisonsScreen'
import TransfertsScreen from './TransfertsScreen'
import { useAuth } from '../lib/AuthContext'
import { usePermissions } from '../lib/permissions'
import { colors, spacing } from '../lib/theme'

type SubView = 'menu' | 'dettes' | 'transferts' | 'livraisons'

const TITLES: Record<Exclude<SubView, 'menu'>, string> = {
  dettes: 'Dettes & créances',
  transferts: 'Transferts',
  livraisons: 'Livraisons',
}

export default function PlusScreen() {
  const route = useRoute<any>()
  const { logout } = useAuth()
  const { detteRemboursement, transfertReception } = usePermissions()
  const [view, setView] = useState<SubView>('menu')

  // Livraisons : consultation en lecture seule ouverte à tous (LIVRAISON_GESTION ne gate que
  // l'affectation/le changement de statut, pas le suivi) — cf. LivraisonsScreen.tsx.
  const autorise: Record<Exclude<SubView, 'menu'>, boolean> = { dettes: detteRemboursement, transferts: transfertReception, livraisons: true }

  useEffect(() => {
    const cible = route.params?.view as SubView | undefined
    if (cible && cible !== 'menu' && autorise[cible]) setView(cible)
  }, [route.params?.view])

  function confirmerDeconnexion() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment fermer la session ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ])
  }

  if (view === 'menu') {
    return (
      <Screen title="Plus">
        {detteRemboursement && (
          <ListRow title="Dettes & créances" subtitle="Suivi et remboursements clients" icon="cash-outline" onPress={() => setView('dettes')} />
        )}
        {transfertReception && (
          <ListRow title="Transferts de stock" subtitle="Réception des transferts entrants" icon="swap-horizontal-outline" onPress={() => setView('transferts')} />
        )}
        <ListRow title="Livraisons" subtitle="Suivi des tournées en cours" icon="bicycle-outline" onPress={() => setView('livraisons')} />
        <ListRow title="Déconnexion" subtitle="Fermer la session" icon="log-out-outline" onPress={confirmerDeconnexion} danger />
      </Screen>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.subHeader}>
        <Pressable onPress={() => setView('menu')} hitSlop={12} style={styles.backRow}>
          <Ionicons name="chevron-back" size={16} color={colors.teal} />
          <Text style={styles.back}>Plus</Text>
        </Pressable>
        <Text style={styles.title}>{TITLES[view]}</Text>
      </View>
      <ScrollView>
        {view === 'dettes' && <DettesScreen />}
        {view === 'transferts' && <TransfertsScreen />}
        {view === 'livraisons' && <LivraisonsScreen />}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  subHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, gap: 6 },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  back: { color: colors.teal, fontSize: 13, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
})
