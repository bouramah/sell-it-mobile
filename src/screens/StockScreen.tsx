import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import Badge from '../components/Badge'
import Card from '../components/Card'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import { api } from '../api/client'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, radius, spacing } from '../lib/theme'
import type { LigneStock, StatutStock } from '../types'

const STATUT_TONE: Record<StatutStock, 'default' | 'success' | 'warning' | 'danger'> = {
  correct: 'success',
  a_surveiller: 'warning',
  critique: 'danger',
}

const STATUT_LABEL: Record<StatutStock, string> = {
  correct: 'Correct',
  a_surveiller: 'À surveiller',
  critique: 'Critique',
}

const STATUT_ICON: Record<StatutStock, keyof typeof Ionicons.glyphMap> = {
  correct: 'checkmark-circle',
  a_surveiller: 'alert-circle',
  critique: 'warning',
}

export default function StockScreen() {
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [stock, setStock] = useState<LigneStock[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    api.stock(boutiqueId)
      .then((s) => {
        setStock(s)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  const filtered = stock.filter((s) => s.produit_nom.toLowerCase().includes(query.toLowerCase()))

  return (
    <Screen title="Stock" scroll={false} error={loadError}>
      <View style={styles.filters}>
        {boutiques.length > 1 && (
          <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
        )}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un produit…"
            placeholderTextColor={colors.inkMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.boutique_id}-${item.produit_id}`}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={loading}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconWrap, { backgroundColor: TONE_BG[item.statut] }]}>
                  <Ionicons name={STATUT_ICON[item.statut]} size={16} color={TONE_FG[item.statut]} />
                </View>
                <Text style={styles.nom} numberOfLines={2}>{item.produit_nom}</Text>
              </View>
              <Badge label={STATUT_LABEL[item.statut]} tone={STATUT_TONE[item.statut]} />
            </View>
            <Text style={styles.meta}>Disponible : {item.quantite_disponible}</Text>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucun produit.'}</Text>}
      />
    </Screen>
  )
}

const TONE_BG: Record<StatutStock, string> = { correct: colors.successBg, a_surveiller: colors.warningBg, critique: colors.dangerBg }
const TONE_FG: Record<StatutStock, string> = { correct: colors.success, a_surveiller: colors.warning, critique: colors.danger }

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: 0, gap: spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nom: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12.5, color: colors.inkMuted, marginLeft: 36 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.xl },
})
