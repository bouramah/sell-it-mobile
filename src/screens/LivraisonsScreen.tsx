import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import { api } from '../api/client'
import { useAuth } from '../lib/AuthContext'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, spacing } from '../lib/theme'
import { STATUT_LIVRAISON_LABELS, type Livraison, type StatutLivraison } from '../types'

const STATUT_TONE: Record<StatutLivraison, 'default' | 'success' | 'warning' | 'danger'> = {
  preparee: 'default',
  en_cours: 'warning',
  livree: 'success',
  echec: 'danger',
}

export default function LivraisonsScreen() {
  const { user } = useAuth()
  const estLivreur = user?.role === 'livreur'
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [livraisons, setLivraisons] = useState<Livraison[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    const req = estLivreur ? api.livraisons({ mine: true }) : boutiqueId ? api.livraisons({ boutiqueId }) : Promise.resolve([])
    req.then(setLivraisons).finally(() => setLoading(false))
  }, [estLivreur, boutiqueId])

  useEffect(refresh, [refresh])

  async function handleStatut(l: Livraison, statut: StatutLivraison) {
    await api.modifierStatutLivraison(l.id, statut)
    refresh()
  }

  async function handlePreuve(l: Livraison) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploadingId(l.id)
    try {
      await api.uploaderPreuveLivraison(l.id, asset.uri, asset.fileName ?? 'preuve.jpg', asset.mimeType ?? 'image/jpeg')
      refresh()
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      {!estLivreur && boutiques.length > 1 && (
        <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
      )}

      <Text style={styles.sectionTitle}>{estLivreur ? 'Mes livraisons' : 'Livraisons de la boutique'}</Text>

      {livraisons.map((l) => (
        <Card key={l.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.nom}>Commande #{l.commande_id}</Text>
            <Badge label={STATUT_LIVRAISON_LABELS[l.statut]} tone={STATUT_TONE[l.statut]} />
          </View>
          <Text style={styles.meta}>{l.adresse}</Text>
          <Text style={styles.meta}>{l.creneau}</Text>
          {!estLivreur && <Text style={styles.meta}>Livreur : {l.livreur || 'Non affecté'}</Text>}

          {estLivreur && l.statut !== 'livree' && l.statut !== 'echec' && (
            <View style={styles.actions}>
              {l.statut === 'preparee' && (
                <Button label="Démarrer la tournée" variant="secondary" onPress={() => handleStatut(l, 'en_cours')} />
              )}
              <View style={styles.actionsRow}>
                <View style={styles.actionFlex}>
                  <Button label="Livrée" onPress={() => handleStatut(l, 'livree')} />
                </View>
                <View style={styles.actionFlex}>
                  <Button label="Échec" variant="danger" onPress={() => handleStatut(l, 'echec')} />
                </View>
              </View>
              <Button
                label={l.preuve_url ? 'Remplacer la preuve' : 'Ajouter une preuve'}
                variant="secondary"
                loading={uploadingId === l.id}
                onPress={() => handlePreuve(l)}
              />
            </View>
          )}
        </Card>
      ))}
      {livraisons.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune livraison.'}</Text>}
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.slate600, textTransform: 'uppercase' },
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  nom: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.slate900 },
  meta: { fontSize: 12, color: colors.slate500 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionFlex: { flex: 1 },
  empty: { textAlign: 'center', color: colors.slate400, marginVertical: spacing.md },
})
