import { useCallback, useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import Badge from '../components/Badge'
import Card from '../components/Card'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import { api } from '../api/client'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, spacing } from '../lib/theme'
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

export default function StockScreen() {
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [stock, setStock] = useState<LigneStock[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    api.stock(boutiqueId).then(setStock).finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  const filtered = stock.filter((s) => s.produit_nom.toLowerCase().includes(query.toLowerCase()))

  return (
    <Screen scroll={false}>
      <View style={styles.filters}>
        {boutiques.length > 1 && (
          <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
        )}
        <View style={styles.searchWrap}>
          <Text style={styles.label}>Rechercher</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nom du produit…"
            placeholderTextColor={colors.slate400}
            style={styles.search}
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
              <Text style={styles.nom} numberOfLines={2}>{item.produit_nom}</Text>
              <Badge label={STATUT_LABEL[item.statut]} tone={STATUT_TONE[item.statut]} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>Disponible : <Text style={styles.metaStrong}>{item.quantite_disponible}</Text></Text>
              <Text style={styles.meta}>Réservé : <Text style={styles.metaStrong}>{item.quantite_reservee}</Text></Text>
              <Text style={styles.meta}>Seuil : <Text style={styles.metaStrong}>{item.seuil_alerte}</Text></Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucun produit.'}</Text>}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: 0, gap: spacing.sm },
  searchWrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate600 },
  search: { borderWidth: 1, borderColor: colors.slate300, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.white },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  nom: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.slate900 },
  meta: { fontSize: 12, color: colors.slate500 },
  metaStrong: { color: colors.slate900, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.slate400, marginTop: spacing.xl },
})
