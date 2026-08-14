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
import { useAuth } from '../lib/AuthContext'
import { useMesBoutiques } from '../lib/useBoutiques'
import { formatGNF } from '../lib/format'
import { colors, spacing } from '../lib/theme'
import type { BadgeTone } from '../components/Badge'
import type { Caisse, LigneDette, ModePaiement, StatutDette } from '../types'
import { MODE_PAIEMENT_LABELS } from '../types'

const STATUT_TONE: Record<StatutDette, BadgeTone> = { en_cours: 'info', en_retard: 'danger', soldee: 'success' }
const STATUT_LABEL: Record<StatutDette, string> = { en_cours: 'En cours', en_retard: 'En retard', soldee: 'Soldée' }

const MODE_OPTIONS = (Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[]).map((m) => ({ value: m, label: MODE_PAIEMENT_LABELS[m] }))

export default function DettesScreen() {
  const { user } = useAuth()
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [dettes, setDettes] = useState<LigneDette[]>([])
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [loading, setLoading] = useState(false)
  const [remboursant, setRemboursant] = useState<LigneDette | null>(null)
  const [montant, setMontant] = useState('')
  const [caisseId, setCaisseId] = useState('')
  const [modePaiement, setModePaiement] = useState<ModePaiement>('especes')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  function nomBoutique(id: string) {
    return boutiques.find((b) => b.id === id)?.nom ?? id
  }

  const refresh = useCallback(() => {
    // Le backend scope déjà par boutique (portée réseau vs boutique du rôle) — boutiqueId
    // permet en plus, pour un gérant multi-boutiques, de filtrer sur une boutique précise.
    setLoading(true)
    Promise.all([api.dettes('client', boutiqueId || undefined), api.caisses()])
      .then(([d, c]) => {
        setDettes(d.filter((x) => x.statut !== 'soldee'))
        setCaisses(c)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  function caissesOuvertesPour(d: LigneDette) {
    return caisses.filter((c) => c.statut === 'ouverte' && c.boutique_id === d.boutique_id)
  }

  function openRembourser(d: LigneDette) {
    setRemboursant(d)
    setMontant(String(d.solde_restant))
    setCaisseId(caissesOuvertesPour(d)[0]?.id ?? '')
    setModePaiement('especes')
    setError(null)
  }

  async function handleRembourser() {
    if (!remboursant) return
    const montantNum = Number(montant)
    if (!montant || montantNum <= 0 || montantNum > remboursant.solde_restant) {
      setError('Le montant doit être positif et ne pas dépasser le solde restant.')
      return
    }
    if (!caisseId) {
      setError('Sélectionnez la caisse concernée.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.encaisserRemboursement(remboursant.id, {
        caisse_id: caisseId,
        montant: montantNum,
        mode_paiement: modePaiement,
        operateur: user ? `${user.prenom} ${user.nom}` : '',
      })
      setRemboursant(null)
      refresh()
      Alert.alert('Remboursement enregistré', `${formatGNF(montantNum)} encaissé pour ${remboursant.tiers_nom}.`)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Échec de l'encaissement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.list}>
      {loadError && <ErrorBanner message={loadError} />}
      {boutiques.length > 1 && (
        <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
      )}
      {dettes.map((d) => {
        const caissesOuvertes = caissesOuvertesPour(d)
        return (
          <Card key={d.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="person-outline" size={16} color={colors.tealDark} />
                </View>
                <Text style={styles.nom}>{d.tiers_nom}</Text>
              </View>
              <Badge label={STATUT_LABEL[d.statut]} tone={STATUT_TONE[d.statut]} />
            </View>
            {boutiques.length > 1 && <Text style={styles.meta}>{nomBoutique(d.boutique_id)}</Text>}
            <Text style={styles.meta}>Solde restant : {formatGNF(d.solde_restant)}</Text>
            {remboursant?.id === d.id ? (
              <View style={styles.form}>
                <TextField label="Montant encaissé (GNF)" value={montant} onChangeText={setMontant} keyboardType="numeric" />
                <PickerField
                  label="Caisse concernée"
                  value={caisseId}
                  onChange={setCaisseId}
                  options={caissesOuvertes.map((c) => ({ value: c.id, label: c.libelle }))}
                  searchable={false}
                />
                {caissesOuvertes.length === 0 && <Text style={styles.warn}>Aucune caisse ouverte pour la boutique de cette dette.</Text>}
                <PickerField label="Mode de paiement" value={modePaiement} onChange={(v) => setModePaiement(v as ModePaiement)} options={MODE_OPTIONS} searchable={false} />
                {error && <Text style={styles.error}>{error}</Text>}
                <View style={styles.actionsRow}>
                  <View style={styles.actionFlex}>
                    <Button label="Annuler" variant="outline" onPress={() => setRemboursant(null)} />
                  </View>
                  <View style={styles.actionFlex}>
                    <Button label="Confirmer" onPress={handleRembourser} loading={saving} />
                  </View>
                </View>
              </View>
            ) : (
              <Button label="Encaisser un remboursement" variant="outline" icon="cash-outline" onPress={() => openRembourser(d)} />
            )}
          </Card>
        )
      })}
      {dettes.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune dette en cours.'}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  nom: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12.5, color: colors.inkMuted },
  form: { gap: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionFlex: { flex: 1 },
  error: { color: colors.danger, fontSize: 13 },
  warn: { color: colors.warning, fontSize: 12 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.xl },
})
