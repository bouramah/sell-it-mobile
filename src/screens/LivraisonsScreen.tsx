import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
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
import { usePermissions } from '../lib/permissions'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, spacing } from '../lib/theme'
import { STATUT_LIVRAISON_LABELS, type CommandeClient, type Livraison, type StatutLivraison, type Utilisateur } from '../types'
import type { BadgeTone } from '../components/Badge'

const STATUT_TONE: Record<StatutLivraison, BadgeTone> = {
  preparee: 'default',
  en_cours: 'warning',
  livree: 'success',
  echec: 'danger',
}

const EMPTY_FORM = { commande_id: '', livreur_user_id: '', adresse: '', creneau: '' }

export default function LivraisonsScreen() {
  const { user } = useAuth()
  const estLivreur = user?.role === 'livreur'
  const { livraisonGestion: canGererLivraison } = usePermissions()
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [livraisons, setLivraisons] = useState<Livraison[]>([])
  const [commandes, setCommandes] = useState<CommandeClient[]>([])
  const [livreurs, setLivreurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    const req = estLivreur ? api.livraisons({ mine: true }) : boutiqueId ? api.livraisons({ boutiqueId }) : Promise.resolve([])
    req
      .then((l) => {
        setLivraisons(l)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
    if (!estLivreur && boutiqueId) {
      api.commandesClients(boutiqueId).then(setCommandes).catch(() => {})
    }
  }, [estLivreur, boutiqueId])

  useEffect(refresh, [refresh])
  useEffect(() => {
    if (!estLivreur) api.utilisateurs().then((users) => setLivreurs(users.filter((u) => u.role === 'livreur'))).catch(() => {})
  }, [estLivreur])

  // Commandes affectables : pas déjà livrées/annulées, et sans livraison en cours vers elles.
  const commandesAffectables = commandes.filter(
    (c) => c.statut !== 'annulee' && c.statut !== 'livree' && !livraisons.some((l) => l.commande_id === c.id && l.statut !== 'echec'),
  )

  function openCreate() {
    setForm(EMPTY_FORM)
    setError(null)
    setCreating(true)
  }

  async function handleSubmit() {
    if (!form.commande_id || !form.livreur_user_id || !form.adresse.trim() || !form.creneau.trim()) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    const livreurUtilisateur = livreurs.find((u) => u.id === form.livreur_user_id)
    if (!livreurUtilisateur) return
    setSaving(true)
    setError(null)
    try {
      await api.creerLivraison({
        commande_id: form.commande_id,
        livreur: `${livreurUtilisateur.prenom} ${livreurUtilisateur.nom}`,
        livreur_user_id: livreurUtilisateur.id,
        boutique_id: boutiqueId,
        adresse: form.adresse.trim(),
        creneau: form.creneau.trim(),
      })
      setCreating(false)
      refresh()
      Alert.alert('Livraison affectée', `${livreurUtilisateur.prenom} ${livreurUtilisateur.nom} — ${form.creneau.trim()}.`)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Échec de l'affectation.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatut(l: Livraison, statut: StatutLivraison) {
    try {
      await api.modifierStatutLivraison(l.id, statut)
      refresh()
      Alert.alert('Statut mis à jour', `Livraison #${l.commande_id} → ${STATUT_LIVRAISON_LABELS[statut]}.`)
    } catch (e) {
      Alert.alert('Action impossible', e instanceof Error && e.message ? e.message : 'Réessayez plus tard.')
    }
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
      Alert.alert('Preuve ajoutée', 'La photo a bien été enregistrée.')
    } catch (e) {
      Alert.alert('Échec', e instanceof Error && e.message ? e.message : "Impossible d'ajouter la preuve.")
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <View style={styles.list}>
      {loadError && <ErrorBanner message={loadError} />}
      {!estLivreur && boutiques.length > 1 && (
        <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
      )}

      {!estLivreur && canGererLivraison && !creating && (
        <Button label="Affecter un livreur" variant="dashed" icon="bicycle-outline" onPress={openCreate} />
      )}

      {!estLivreur && creating && (
        <Card style={styles.formCard}>
          <PickerField
            label="Commande"
            value={form.commande_id}
            onChange={(v) => setForm((f) => ({ ...f, commande_id: v }))}
            options={commandesAffectables.map((c) => ({ value: c.id, label: `#${c.id} — ${c.client_nom}` }))}
            placeholder={commandesAffectables.length ? 'Sélectionner…' : 'Aucune commande à affecter'}
          />
          <PickerField
            label="Livreur"
            value={form.livreur_user_id}
            onChange={(v) => setForm((f) => ({ ...f, livreur_user_id: v }))}
            options={livreurs.map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))}
            placeholder={livreurs.length ? 'Sélectionner…' : 'Aucun compte livreur'}
          />
          <TextField label="Adresse" value={form.adresse} onChangeText={(v) => setForm((f) => ({ ...f, adresse: v }))} placeholder="Ex : Kaloum, Almamya" />
          <TextField label="Créneau" value={form.creneau} onChangeText={(v) => setForm((f) => ({ ...f, creneau: v }))} placeholder="Ex : 14h-16h" />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actionsRow}>
            <View style={styles.actionFlex}>
              <Button label="Annuler" variant="outline" onPress={() => setCreating(false)} />
            </View>
            <View style={styles.actionFlex}>
              <Button label="Affecter" onPress={handleSubmit} loading={saving} />
            </View>
          </View>
        </Card>
      )}

      {livraisons.map((l) => (
        <Card key={l.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="bicycle-outline" size={16} color={colors.tealDark} />
              </View>
              <Text style={styles.nom}>#{l.commande_id}</Text>
            </View>
            <Badge label={STATUT_LIVRAISON_LABELS[l.statut]} tone={STATUT_TONE[l.statut]} />
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.inkMuted} />
            <Text style={styles.meta}>{l.adresse} · {l.creneau}</Text>
          </View>
          {!estLivreur && (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={13} color={colors.inkMuted} />
              <Text style={styles.meta}>Livreur : {l.livreur || 'Non affecté'}</Text>
            </View>
          )}

          {estLivreur && l.statut !== 'livree' && l.statut !== 'echec' && (
            <View style={styles.actions}>
              {l.statut === 'preparee' && (
                <Button label="Démarrer la tournée" variant="outline" icon="play-outline" onPress={() => handleStatut(l, 'en_cours')} />
              )}
              <View style={styles.actionsRow}>
                <View style={styles.actionFlex}>
                  <Button label="Livrée" variant="success" icon="checkmark-circle" onPress={() => handleStatut(l, 'livree')} />
                </View>
                <View style={styles.actionFlex}>
                  <Button label="Échec" variant="danger" icon="close-circle" onPress={() => handleStatut(l, 'echec')} />
                </View>
              </View>
              <Button
                label={l.preuve_url ? 'Remplacer la preuve' : 'Ajouter une preuve'}
                variant="outline"
                icon="camera-outline"
                loading={uploadingId === l.id}
                onPress={() => handlePreuve(l)}
              />
            </View>
          )}
        </Card>
      ))}
      {livraisons.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune livraison.'}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  formCard: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 13 },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  nom: { fontSize: 15, fontWeight: '700', color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 12.5, color: colors.inkMuted },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionFlex: { flex: 1 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.xl },
})
