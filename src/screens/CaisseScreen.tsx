import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import TextField from '../components/TextField'
import { api } from '../api/client'
import { useAuth } from '../lib/AuthContext'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, spacing } from '../lib/theme'
import type { Caisse, LigneMouvementCaisse, StatutCaisse, TypeMouvementCaisse } from '../types'

const STATUT_TONE: Record<StatutCaisse, 'default' | 'success' | 'warning' | 'danger'> = {
  ouverte: 'success',
  fermee: 'default',
  ecart_signale: 'danger',
}
const STATUT_LABEL: Record<StatutCaisse, string> = { ouverte: 'Ouverte', fermee: 'Fermée', ecart_signale: 'Écart signalé' }

function formatGNF(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} GNF`
}

export default function CaisseScreen() {
  const { user } = useAuth()
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [mouvements, setMouvements] = useState<LigneMouvementCaisse[]>([])
  const [loading, setLoading] = useState(false)

  const [openingCaisse, setOpeningCaisse] = useState(false)
  const [libelle, setLibelle] = useState('')
  const [fondInitial, setFondInitial] = useState('')

  const [closingCaisse, setClosingCaisse] = useState<Caisse | null>(null)
  const [soldeReel, setSoldeReel] = useState('')

  const [creatingMouvement, setCreatingMouvement] = useState(false)
  const [mvtCaisseId, setMvtCaisseId] = useState('')
  const [mvtType, setMvtType] = useState<TypeMouvementCaisse>('encaissement')
  const [mvtMotif, setMvtMotif] = useState('')
  const [mvtMontant, setMvtMontant] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    Promise.all([api.caisses(boutiqueId), api.mouvementsCaisse(boutiqueId)])
      .then(([c, m]) => {
        setCaisses(c)
        setMouvements(m.slice(0, 20))
      })
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  const operateur = user ? `${user.prenom} ${user.nom}` : ''
  const caissesOuvertes = caisses.filter((c) => c.statut === 'ouverte')

  async function handleOuvrir() {
    if (!libelle || !fondInitial) {
      setError('Renseignez le libellé et le fond de caisse.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.creerCaisse({ boutique_id: boutiqueId, libelle, fond_initial: Number(fondInitial), operateur })
      setOpeningCaisse(false)
      setLibelle('')
      setFondInitial('')
      refresh()
    } catch {
      setError("Échec de l'ouverture de caisse.")
    } finally {
      setSaving(false)
    }
  }

  async function handleFermer() {
    if (!closingCaisse || !soldeReel) {
      setError('Renseignez le solde compté.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.fermerCaisse(closingCaisse.id, Number(soldeReel))
      setClosingCaisse(null)
      setSoldeReel('')
      refresh()
    } catch {
      setError('Échec de la fermeture de caisse.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRouvrir(c: Caisse) {
    await api.rouvrirCaisse(c.id)
    refresh()
  }

  async function handleMouvement() {
    if (!mvtCaisseId || !mvtMotif || !mvtMontant) {
      setError('Tous les champs sont requis.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.creerMouvementCaisse({ caisse_id: mvtCaisseId, type: mvtType, motif: mvtMotif, operateur, montant: Number(mvtMontant) })
      setCreatingMouvement(false)
      setMvtMotif('')
      setMvtMontant('')
      refresh()
    } catch {
      setError("Échec de l'enregistrement du mouvement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      {boutiques.length > 1 && (
        <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Caisses</Text>
        <Button label="+ Ouvrir" onPress={() => setOpeningCaisse(true)} variant="secondary" />
      </View>

      {caisses.map((c) => (
        <Card key={c.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.nom}>{c.libelle}</Text>
            <Badge label={STATUT_LABEL[c.statut]} tone={STATUT_TONE[c.statut]} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.meta}>Fond initial : <Text style={styles.metaStrong}>{formatGNF(c.fond_initial)}</Text></Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.meta}>Théorique : <Text style={styles.metaStrong}>{formatGNF(c.solde_theorique)}</Text></Text>
            <Text style={styles.meta}>Réel : <Text style={styles.metaStrong}>{formatGNF(c.solde_reel)}</Text></Text>
          </View>
          {c.statut === 'ouverte' ? (
            <Button label="Fermer la caisse" variant="secondary" onPress={() => setClosingCaisse(c)} />
          ) : (
            <Button label="Rouvrir" variant="secondary" onPress={() => handleRouvrir(c)} />
          )}
        </Card>
      ))}
      {caisses.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune caisse pour cette boutique.'}</Text>}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Derniers mouvements</Text>
        <Button label="+ Mouvement" onPress={() => setCreatingMouvement(true)} variant="secondary" disabled={caissesOuvertes.length === 0} />
      </View>
      {mouvements.map((m) => (
        <Card key={m.id} style={styles.mvtCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.mvtMotif}>{m.motif}</Text>
            <Text style={[styles.mvtMontant, { color: m.type === 'encaissement' ? colors.emerald600 : colors.red600 }]}>
              {m.type === 'encaissement' ? '+' : '−'}{formatGNF(Math.abs(m.montant))}
            </Text>
          </View>
          <Text style={styles.meta}>{m.caisse_libelle} · {m.operateur}</Text>
        </Card>
      ))}

      {/* Ouvrir une caisse */}
      <Modal visible={openingCaisse} animationType="slide" transparent onRequestClose={() => setOpeningCaisse(false)}>
        <FormSheet title="Ouvrir une caisse" onClose={() => setOpeningCaisse(false)}>
          <TextField label="Libellé" value={libelle} onChangeText={setLibelle} placeholder="Ex : Caisse principale" />
          <TextField label="Fond de caisse initial (GNF)" value={fondInitial} onChangeText={setFondInitial} keyboardType="numeric" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Ouvrir" onPress={handleOuvrir} loading={saving} />
        </FormSheet>
      </Modal>

      {/* Fermer une caisse */}
      <Modal visible={!!closingCaisse} animationType="slide" transparent onRequestClose={() => setClosingCaisse(null)}>
        <FormSheet title={`Fermer ${closingCaisse?.libelle ?? ''}`} onClose={() => setClosingCaisse(null)}>
          <TextField label="Solde réel compté (GNF)" value={soldeReel} onChangeText={setSoldeReel} keyboardType="numeric" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Fermer la caisse" onPress={handleFermer} loading={saving} />
        </FormSheet>
      </Modal>

      {/* Nouveau mouvement */}
      <Modal visible={creatingMouvement} animationType="slide" transparent onRequestClose={() => setCreatingMouvement(false)}>
        <FormSheet title="Nouveau mouvement" onClose={() => setCreatingMouvement(false)}>
          <PickerField
            label="Caisse"
            value={mvtCaisseId}
            onChange={setMvtCaisseId}
            options={caissesOuvertes.map((c) => ({ value: c.id, label: c.libelle }))}
          />
          <PickerField
            label="Type"
            value={mvtType}
            onChange={(v) => setMvtType(v as TypeMouvementCaisse)}
            options={[{ value: 'encaissement', label: 'Encaissement' }, { value: 'decaissement', label: 'Décaissement' }]}
            searchable={false}
          />
          <TextField label="Motif" value={mvtMotif} onChangeText={setMvtMotif} placeholder="Ex : Vente comptoir" />
          <TextField label="Montant (GNF)" value={mvtMontant} onChangeText={setMvtMontant} keyboardType="numeric" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Enregistrer" onPress={handleMouvement} loading={saving} />
        </FormSheet>
      </Modal>
    </Screen>
  )
}

function FormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>{children}</ScrollView>
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.slate600, textTransform: 'uppercase' },
  card: { gap: spacing.xs },
  mvtCard: { gap: 2, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  nom: { fontSize: 15, fontWeight: '600', color: colors.slate900 },
  meta: { fontSize: 12, color: colors.slate500 },
  metaStrong: { color: colors.slate900, fontWeight: '600' },
  mvtMotif: { fontSize: 14, color: colors.slate900, fontWeight: '500' },
  mvtMontant: { fontSize: 14, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.slate400, marginVertical: spacing.md },
  error: { color: colors.red600, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  close: { fontSize: 18, color: colors.slate400 },
  sheetBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
})
