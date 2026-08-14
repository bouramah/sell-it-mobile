import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import ActionTile from '../components/ActionTile'
import Screen from '../components/Screen'
import StatCard from '../components/StatCard'
import { api } from '../api/client'
import { useMesBoutiques } from '../lib/useBoutiques'
import { formatGNF, isToday, relativeTime } from '../lib/format'
import { colors, spacing } from '../lib/theme'
import type { CommandeClient, LigneDette, LigneMouvementCaisse } from '../types'

interface Activite {
  id: string
  titre: string
  horodatage: string
  color: string
  icon: keyof typeof Ionicons.glyphMap
}

export default function AccueilScreen() {
  const navigation = useNavigation<any>()
  const { boutiqueId } = useMesBoutiques()
  const [commandes, setCommandes] = useState<CommandeClient[]>([])
  const [dettes, setDettes] = useState<LigneDette[]>([])
  const [mouvements, setMouvements] = useState<LigneMouvementCaisse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    Promise.all([api.commandesClients(boutiqueId), api.dettes('client'), api.mouvementsCaisse(boutiqueId)])
      .then(([c, d, m]) => {
        setCommandes(c)
        setDettes(d.filter((x) => x.boutique_id === boutiqueId))
        setMouvements(m)
        setError(null)
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  const commandesDuJour = commandes.filter((c) => isToday(c.date_creation) && c.statut !== 'annulee')
  const ventesDuJour = commandesDuJour.reduce((s, c) => s + c.montant, 0)
  const panierMoyen = commandesDuJour.length ? ventesDuJour / commandesDuJour.length : 0
  const commandesEnAttente = commandes.filter((c) => c.statut === 'en_attente').length
  const dettesARecouvrer = dettes.reduce((s, d) => s + d.solde_restant, 0)

  const activites: Activite[] = [
    ...mouvements.slice(0, 5).map((m) => ({
      id: `m-${m.id}`,
      titre: `${m.type === 'encaissement' ? 'Vente encaissée' : 'Décaissement'} — ${formatGNF(Math.abs(m.montant))}`,
      horodatage: m.horodatage,
      color: m.type === 'encaissement' ? colors.success : colors.danger,
      icon: (m.type === 'encaissement' ? 'arrow-down-circle' : 'arrow-up-circle') as keyof typeof Ionicons.glyphMap,
    })),
    ...commandes.slice(0, 5).map((c) => ({
      id: `c-${c.id}`,
      titre: `Commande #${c.id} ${c.statut === 'en_attente' ? 'reçue' : c.statut}`,
      horodatage: c.date_creation,
      color: colors.teal,
      icon: 'receipt' as keyof typeof Ionicons.glyphMap,
    })),
  ]
    .sort((a, b) => new Date(b.horodatage).getTime() - new Date(a.horodatage).getTime())
    .slice(0, 6)

  return (
    <Screen title="Accueil" onRefresh={refresh} refreshing={loading} error={error}>
      <View style={styles.grid}>
        <StatCard label="Ventes du jour" value={formatGNF(ventesDuJour)} icon="trending-up" color={colors.teal} />
        <StatCard label="Panier moyen" value={formatGNF(panierMoyen)} icon="pricetag" color={colors.success} />
        <StatCard label="Commandes en attente" value={String(commandesEnAttente)} icon="time" color={colors.warning} />
        <StatCard label="Dettes à recouvrer" value={formatGNF(dettesARecouvrer)} icon="alert-circle" color={colors.danger} />
      </View>

      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.tileGrid}>
        <ActionTile label="Nouvelle vente" color={colors.teal} icon="cart" onPress={() => navigation.navigate('Caisse')} />
        <ActionTile label="Nouvelle commande" color={colors.success} icon="receipt" onPress={() => navigation.navigate('Commandes', { openCreate: true })} />
        <ActionTile label="Recevoir un transfert" color={colors.warning} icon="swap-horizontal" onPress={() => navigation.navigate('Plus', { view: 'transferts' })} />
        <ActionTile label="Encaisser une dette" color={colors.danger} icon="cash" onPress={() => navigation.navigate('Plus', { view: 'dettes' })} />
        <ActionTile label="Suivi des livraisons" color={colors.inkMuted2} icon="bicycle" onPress={() => navigation.navigate('Plus', { view: 'livraisons' })} />
      </View>

      <Text style={styles.sectionTitle}>Activité récente</Text>
      <View style={styles.activityList}>
        {activites.map((a) => (
          <View key={a.id} style={styles.activityRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: `${a.color}1a` }]}>
              <Ionicons name={a.icon} size={16} color={a.color} />
            </View>
            <View style={styles.activityTexts}>
              <Text style={styles.activityTitle}>{a.titre}</Text>
              <Text style={styles.activityTime}>{relativeTime(a.horodatage)}</Text>
            </View>
          </View>
        ))}
        {activites.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune activité récente.'}</Text>}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: spacing.sm },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  activityList: { gap: 0 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  activityIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  activityTexts: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  activityTime: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
  empty: { textAlign: 'center', color: colors.inkMuted, paddingVertical: spacing.md },
})
