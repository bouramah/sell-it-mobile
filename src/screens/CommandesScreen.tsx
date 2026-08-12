import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import TextField from '../components/TextField'
import { api } from '../api/client'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, spacing } from '../lib/theme'
import { MODE_PAIEMENT_LABELS, type CommandeClient, type LigneStock, type ModePaiement, type StatutCommandeClient } from '../types'

const STATUT_TONE: Record<StatutCommandeClient, 'default' | 'success' | 'warning' | 'danger'> = {
  en_attente: 'default',
  confirmee: 'warning',
  en_preparation: 'warning',
  en_livraison: 'warning',
  livree: 'success',
  annulee: 'danger',
}
const STATUT_LABEL: Record<StatutCommandeClient, string> = {
  en_attente: 'En attente', confirmee: 'Confirmée', en_preparation: 'En préparation',
  en_livraison: 'En livraison', livree: 'Livrée', annulee: 'Annulée',
}

function formatGNF(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} GNF`
}

interface CartLine {
  produit_id: string
  produit_nom: string
  quantite: number
  prix_unitaire: number
}

export default function CommandesScreen() {
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [commandes, setCommandes] = useState<CommandeClient[]>([])
  const [stock, setStock] = useState<LigneStock[]>([])
  const [loading, setLoading] = useState(false)

  const [creating, setCreating] = useState(false)
  const [clientNom, setClientNom] = useState('')
  const [modePaiement, setModePaiement] = useState<ModePaiement>('especes')
  const [cart, setCart] = useState<CartLine[]>([])
  const [produitChoisi, setProduitChoisi] = useState('')
  const [quantite, setQuantite] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    Promise.all([api.commandesClients(boutiqueId), api.stock(boutiqueId)])
      .then(([c, s]) => {
        setCommandes(c.slice().reverse())
        setStock(s)
      })
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])

  function openCreate() {
    setClientNom('')
    setModePaiement('especes')
    setCart([])
    setProduitChoisi('')
    setQuantite('1')
    setError(null)
    setCreating(true)
  }

  function ajouterArticle() {
    const produit = stock.find((s) => s.produit_id === produitChoisi)
    const qte = Number(quantite)
    if (!produit || !qte || qte <= 0) return
    setCart((c) => [...c, { produit_id: produit.produit_id, produit_nom: produit.produit_nom, quantite: qte, prix_unitaire: 0 }])
    setProduitChoisi('')
    setQuantite('1')
  }

  function retirerArticle(index: number) {
    setCart((c) => c.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!clientNom || cart.length === 0) {
      setError('Renseignez le client et au moins un article.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.creerCommandeClient({
        client_nom: clientNom,
        boutique_id: boutiqueId,
        canal: 'boutique',
        mode_paiement: modePaiement,
        statut: 'confirmee',
        articles: cart.map((l) => ({ produit_id: l.produit_id, quantite: l.quantite })),
      })
      setCreating(false)
      refresh()
    } catch {
      setError("Échec de la création de la commande.")
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
        <Text style={styles.sectionTitle}>Commandes récentes</Text>
        <Button label="+ Nouvelle" onPress={openCreate} variant="secondary" />
      </View>

      {commandes.map((c) => (
        <Card key={c.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.nom}>#{c.id} — {c.client_nom}</Text>
            <Badge label={STATUT_LABEL[c.statut]} tone={STATUT_TONE[c.statut]} />
          </View>
          <Text style={styles.meta}>{MODE_PAIEMENT_LABELS[c.mode_paiement]} · {formatGNF(c.montant)}</Text>
        </Card>
      ))}
      {commandes.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune commande.'}</Text>}

      <Modal visible={creating} animationType="slide" transparent onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouvelle commande</Text>
              <Pressable onPress={() => setCreating(false)}><Text style={styles.close}>✕</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <TextField label="Client" value={clientNom} onChangeText={setClientNom} placeholder="Nom du client" />
              <PickerField
                label="Mode de paiement"
                value={modePaiement}
                onChange={(v) => setModePaiement(v as ModePaiement)}
                options={Object.entries(MODE_PAIEMENT_LABELS).map(([value, label]) => ({ value, label }))}
                searchable={false}
              />

              <Text style={styles.sub}>Articles</Text>
              <PickerField
                label="Produit"
                value={produitChoisi}
                onChange={setProduitChoisi}
                options={stock.map((s) => ({ value: s.produit_id, label: `${s.produit_nom} (${s.quantite_disponible} dispo.)` }))}
              />
              <View style={styles.addRow}>
                <View style={styles.qteField}>
                  <TextField label="Quantité" value={quantite} onChangeText={setQuantite} keyboardType="numeric" />
                </View>
                <Button label="Ajouter" variant="secondary" onPress={ajouterArticle} />
              </View>

              {cart.map((l, i) => (
                <View key={i} style={styles.cartRow}>
                  <Text style={styles.cartText}>{l.produit_nom} × {l.quantite}</Text>
                  <Pressable onPress={() => retirerArticle(i)}><Text style={styles.remove}>✕</Text></Pressable>
                </View>
              ))}

              {error && <Text style={styles.error}>{error}</Text>}
              <Button label="Créer la commande" onPress={handleSubmit} loading={saving} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.slate600, textTransform: 'uppercase' },
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  nom: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.slate900 },
  meta: { fontSize: 12, color: colors.slate500 },
  empty: { textAlign: 'center', color: colors.slate400, marginVertical: spacing.md },
  sub: { fontSize: 13, fontWeight: '700', color: colors.slate600, marginTop: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  qteField: { flex: 1 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.slate100 },
  cartText: { fontSize: 14, color: colors.slate900 },
  remove: { color: colors.red600, fontSize: 16, paddingHorizontal: spacing.sm },
  error: { color: colors.red600, fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  close: { fontSize: 18, color: colors.slate400 },
  sheetBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
})
