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
import type { Boutique, StatutTransfert, TransfertStock } from '../types'

const STATUT_TONE: Record<StatutTransfert, BadgeTone> = { demande: 'default', valide: 'info', en_transit: 'warning', recu: 'success' }
const STATUT_LABEL: Record<StatutTransfert, string> = { demande: 'Demandé', valide: 'Validé', en_transit: 'En transit', recu: 'Reçu' }

interface LigneReceptionForm {
  produit_id: string
  produit_nom: string
  quantite: number
  quantite_recue: string
  motif_ecart: string
}

export default function TransfertsScreen() {
  const { boutiqueId, boutiques, setBoutiqueId } = useMesBoutiques()
  const [transferts, setTransferts] = useState<TransfertStock[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [receptionOuverte, setReceptionOuverte] = useState<string | null>(null)
  const [lignesReception, setLignesReception] = useState<LigneReceptionForm[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    api.transferts()
      .then((t) => {
        setTransferts(t.filter((x) => x.boutique_destination_id === boutiqueId))
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  function nomBoutique(id: string) {
    return boutiques.find((b: Boutique) => b.id === id)?.nom ?? id
  }

  function ouvrirReception(t: TransfertStock) {
    setReceptionOuverte(t.id)
    setLignesReception(t.lignes.map((l) => ({ produit_id: l.produit_id, produit_nom: l.produit_nom, quantite: l.quantite, quantite_recue: String(l.quantite), motif_ecart: '' })))
    setError(null)
  }

  function updateLigneReception(produitId: string, patch: Partial<LigneReceptionForm>) {
    setLignesReception((ls) => ls.map((l) => (l.produit_id === produitId ? { ...l, ...patch } : l)))
  }

  async function confirmerReception(t: TransfertStock) {
    for (const l of lignesReception) {
      const recue = Number(l.quantite_recue)
      if (!Number.isFinite(recue) || recue < 0 || recue > l.quantite) {
        setError(`Quantité reçue invalide pour ${l.produit_nom} (entre 0 et ${l.quantite}).`)
        return
      }
      if (recue < l.quantite && !l.motif_ecart.trim()) {
        setError(`Motif obligatoire pour ${l.produit_nom} : indiquez la raison de l'écart (casse, perte…).`)
        return
      }
    }
    setConfirmingId(t.id)
    setError(null)
    try {
      const lignesPayload = lignesReception.map((l) => ({
        produit_id: l.produit_id, quantite_recue: Number(l.quantite_recue), motif_ecart: l.motif_ecart.trim() || undefined,
      }))
      await api.modifierStatutTransfert(t.id, 'recu', lignesPayload)
      setReceptionOuverte(null)
      refresh()
      const ecart = lignesPayload.some((l) => l.quantite_recue < (lignesReception.find((r) => r.produit_id === l.produit_id)?.quantite ?? 0))
      Alert.alert(
        ecart ? 'Transfert réceptionné — écart signalé' : 'Transfert réceptionné',
        ecart ? "Un écart a été enregistré sur au moins un produit." : 'Le stock a été mis à jour.',
      )
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
              <Text style={styles.nom}>{t.lignes.length} produit{t.lignes.length > 1 ? 's' : ''}</Text>
            </View>
            <Badge label={STATUT_LABEL[t.statut]} tone={STATUT_TONE[t.statut]} />
          </View>
          <Text style={styles.meta}>{t.lignes.map((l) => `${l.quantite} x ${l.produit_nom}`).join(', ')}</Text>
          <View style={styles.routeRow}>
            <Text style={styles.meta}>{nomBoutique(t.boutique_source_id)}</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.inkMuted} />
            <Text style={styles.meta}>{nomBoutique(t.boutique_destination_id)}</Text>
          </View>
          {t.statut === 'en_transit' && receptionOuverte !== t.id && (
            <Button label="Confirmer la réception" variant="success" icon="checkmark-circle" onPress={() => ouvrirReception(t)} />
          )}
          {receptionOuverte === t.id && (
            <View style={styles.receptionForm}>
              {lignesReception.map((l) => (
                <View key={l.produit_id} style={styles.ligneReception}>
                  <Text style={styles.nom}>{l.produit_nom}</Text>
                  <TextField
                    label={`Quantité réellement reçue (sur ${l.quantite})`}
                    value={l.quantite_recue}
                    onChangeText={(v) => updateLigneReception(l.produit_id, { quantite_recue: v })}
                    keyboardType="numeric"
                  />
                  {Number(l.quantite_recue) < l.quantite && (
                    <TextField
                      label="Motif de l'écart (casse, perte…)"
                      value={l.motif_ecart}
                      onChangeText={(v) => updateLigneReception(l.produit_id, { motif_ecart: v })}
                      placeholder="Ex : 2 unités cassées pendant le transport"
                    />
                  )}
                </View>
              ))}
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
  ligneReception: { gap: spacing.xs, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  error: { color: colors.danger, fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionFlex: { flex: 1 },
})
