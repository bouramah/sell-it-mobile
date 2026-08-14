import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorBanner from '../components/ErrorBanner'
import PickerField from '../components/PickerField'
import TextField from '../components/TextField'
import { api } from '../api/client'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, spacing } from '../lib/theme'
import type { BadgeTone } from '../components/Badge'
import type { Boutique, Produit, StatutTransfert, TransfertStock } from '../types'

const STATUT_TONE: Record<StatutTransfert, BadgeTone> = { demande: 'default', valide: 'info', en_transit: 'warning', recu: 'success' }
const STATUT_LABEL: Record<StatutTransfert, string> = { demande: 'Demandé', valide: 'Validé', en_transit: 'En transit', recu: 'Reçu' }

export default function TransfertsScreen() {
  const { boutiqueId, boutiques, setBoutiqueId } = useMesBoutiques()
  const [transferts, setTransferts] = useState<TransfertStock[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [receptionOuverte, setReceptionOuverte] = useState<string | null>(null)
  const [quantiteRecue, setQuantiteRecue] = useState('')
  const [motifEcart, setMotifEcart] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([api.transferts(), api.produits()])
      .then(([t, p]) => {
        setTransferts(t.filter((x) => x.boutique_destination_id === boutiqueId))
        setProduits(p)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  function nomBoutique(id: string) {
    return boutiques.find((b: Boutique) => b.id === id)?.nom ?? id
  }
  function nomProduit(id: string) {
    return produits.find((p) => p.id === id)?.nom ?? id
  }

  function ouvrirReception(t: TransfertStock) {
    setReceptionOuverte(t.id)
    setQuantiteRecue(String(t.quantite))
    setMotifEcart('')
    setError(null)
  }

  async function confirmerReception(t: TransfertStock) {
    const recue = Number(quantiteRecue)
    if (!Number.isFinite(recue) || recue < 0 || recue > t.quantite) {
      setError(`La quantité reçue doit être comprise entre 0 et ${t.quantite}.`)
      return
    }
    if (recue < t.quantite && !motifEcart.trim()) {
      setError('Motif obligatoire : indiquez la raison de l\'écart (casse, perte…).')
      return
    }
    setConfirmingId(t.id)
    setError(null)
    try {
      await api.modifierStatutTransfert(t.id, 'recu', recue, motifEcart.trim() || undefined)
      setReceptionOuverte(null)
      refresh()
      if (recue < t.quantite) {
        Alert.alert('Transfert réceptionné — écart signalé', `${recue}/${t.quantite} reçus. L'écart a été enregistré.`)
      } else {
        Alert.alert('Transfert réceptionné', `${recue} unité(s) ajoutée(s) au stock.`)
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Échec de l'enregistrement.")
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <View style={styles.list}>
      {loadError && <ErrorBanner message={loadError} />}
      {boutiques.length > 1 && (
        <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
      )}
      {transferts.map((t) => (
        <Card key={t.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="cube-outline" size={16} color={colors.tealDark} />
              </View>
              <Text style={styles.nom}>{nomProduit(t.produit_id)}</Text>
            </View>
            <Badge label={STATUT_LABEL[t.statut]} tone={STATUT_TONE[t.statut]} />
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.meta}>{nomBoutique(t.boutique_source_id)}</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.inkMuted} />
            <Text style={styles.meta}>{nomBoutique(t.boutique_destination_id)}</Text>
            <Text style={styles.meta}>· Qté {t.quantite}</Text>
          </View>
          {t.statut === 'en_transit' && receptionOuverte !== t.id && (
            <Button label="Confirmer la réception" variant="success" icon="checkmark-circle" onPress={() => ouvrirReception(t)} />
          )}
          {receptionOuverte === t.id && (
            <View style={styles.receptionForm}>
              <TextField label={`Quantité réellement reçue (sur ${t.quantite})`} value={quantiteRecue} onChangeText={setQuantiteRecue} keyboardType="numeric" />
              {Number(quantiteRecue) < t.quantite && (
                <TextField label="Motif de l'écart (casse, perte…)" value={motifEcart} onChangeText={setMotifEcart} placeholder="Ex : 2 unités cassées pendant le transport" />
              )}
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.actionsRow}>
                <View style={styles.actionFlex}>
                  <Button label="Annuler" variant="outline" onPress={() => setReceptionOuverte(null)} />
                </View>
                <View style={styles.actionFlex}>
                  <Button label="Confirmer" variant="success" icon="checkmark-circle" onPress={() => confirmerReception(t)} loading={confirmingId === t.id} />
                </View>
              </View>
            </View>
          )}
        </Card>
      ))}
      {transferts.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucun transfert.'}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  nom: { fontSize: 15, fontWeight: '700', color: colors.ink },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  meta: { fontSize: 12.5, color: colors.inkMuted },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.xl },
  receptionForm: { gap: spacing.sm, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionFlex: { flex: 1 },
})
