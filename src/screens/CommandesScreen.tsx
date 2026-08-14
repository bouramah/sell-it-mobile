import { Ionicons } from '@expo/vector-icons'
import { useRoute } from '@react-navigation/native'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import TextField from '../components/TextField'
import { api } from '../api/client'
import { imprimerOuPartagerDocument } from '../lib/documents'
import { usePermissions } from '../lib/permissions'
import { useMesBoutiques } from '../lib/useBoutiques'
import { formatGNF } from '../lib/format'
import { colors, radius, spacing } from '../lib/theme'
import {
  MODE_PAIEMENT_LABELS,
  PALIER_PRIX_LABELS,
  palierSuggere,
  prixPourPalier,
  type Client,
  type CommandeClient,
  type LigneStock,
  type ModePaiement,
  type PalierPrix,
  type Produit,
  type StatutCommandeClient,
} from '../types'
import type { BadgeTone } from '../components/Badge'

const STATUT_TONE: Record<StatutCommandeClient, BadgeTone> = {
  en_attente: 'default',
  confirmee: 'info',
  en_preparation: 'warning',
  en_livraison: 'warning',
  livree: 'success',
  annulee: 'danger',
}
const STATUT_LABEL: Record<StatutCommandeClient, string> = {
  en_attente: 'En attente', confirmee: 'Confirmée', en_preparation: 'Préparation',
  en_livraison: 'En livraison', livree: 'Livrée', annulee: 'Annulée',
}
const STATUTS: StatutCommandeClient[] = ['en_attente', 'confirmee', 'en_preparation', 'en_livraison', 'livree', 'annulee']
const STATUT_OPTIONS = STATUTS.map((s) => ({ value: s, label: STATUT_LABEL[s] }))
const MODE_OPTIONS = (Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[]).map((m) => ({ value: m, label: MODE_PAIEMENT_LABELS[m] }))
const PALIER_OPTIONS_PICKER = (['detail', 'semi_gros', 'gros'] as PalierPrix[]).map((p) => ({ value: p, label: PALIER_PRIX_LABELS[p] }))

// Au-delà de cette remise (part du prix catalogue non facturée), un motif devient obligatoire
// et la commande reste bloquée en attente de validation gérant/siège — le backend recalcule et
// refuse si absent, ceci n'est qu'un garde-fou côté UI.
const SEUIL_REMISE = 0.10

export default function CommandesScreen() {
  const route = useRoute<any>()
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const { remiseValidation, commandeClient: canGererCommande } = usePermissions()
  const [commandes, setCommandes] = useState<CommandeClient[]>([])
  const [stock, setStock] = useState<LigneStock[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [changingStatutId, setChangingStatutId] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [clientId, setClientId] = useState('')
  const [modePaiement, setModePaiement] = useState<ModePaiement>('especes')
  const [produitChoisi, setProduitChoisi] = useState('')
  const [quantite, setQuantite] = useState('1')
  const [palier, setPalier] = useState<PalierPrix>('detail')
  const [palierManuel, setPalierManuel] = useState(false)
  const [prix, setPrix] = useState('')
  const [remiseMotif, setRemiseMotif] = useState('')
  const [cart, setCart] = useState<{ produit_id: string; produit_nom: string; palier: PalierPrix; quantite: number; prix_unitaire: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    Promise.all([api.commandesClients(boutiqueId), api.stock(boutiqueId), api.produits(), api.clients(boutiqueId)])
      .then(([c, s, p, cl]) => {
        setCommandes(c.slice().reverse())
        setStock(s)
        setProduits(p)
        setClients(cl)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])
  useEffect(() => {
    if (route.params?.openCreate) openCreate()
  }, [route.params?.openCreate])

  function openCreate() {
    setClientId('')
    setModePaiement('especes')
    setCart([])
    setProduitChoisi('')
    setQuantite('1')
    setPalier('detail')
    setPalierManuel(false)
    setPrix('')
    setRemiseMotif('')
    setError(null)
    setCreating(true)
  }

  function choisirProduit(produitId: string) {
    setProduitChoisi(produitId)
    setPalierManuel(false)
    const s = stock.find((x) => x.produit_id === produitId)
    const p = produits.find((x) => x.id === produitId)
    const qte = Number(quantite) || 1
    const suggere = p ? palierSuggere(qte, p) : 'detail'
    setPalier(suggere)
    setPrix(s ? String(prixPourPalier(s, suggere)) : '')
  }

  function changerQuantiteFormulaire(v: string) {
    setQuantite(v)
    if (palierManuel) return
    const p = produits.find((x) => x.id === produitChoisi)
    if (!p) return
    // Le palier suit toujours la quantité (seuils définis au niveau du produit) — le prix, lui,
    // dépend du stock de la boutique choisie et peut être absent si le produit n'y est pas stocké.
    const suggere = palierSuggere(Number(v) || 1, p)
    setPalier(suggere)
    const s = stock.find((x) => x.produit_id === produitChoisi)
    if (s) setPrix(String(prixPourPalier(s, suggere)))
  }

  function changerPalierFormulaire(v: string) {
    const p = v as PalierPrix
    setPalier(p)
    setPalierManuel(true)
    const s = stock.find((x) => x.produit_id === produitChoisi)
    if (s) setPrix(String(prixPourPalier(s, p)))
  }

  function changerPrixFormulaire(v: string) {
    setPrix(v)
    setPalierManuel(true)
  }

  function ajouterArticle() {
    const produit = stock.find((s) => s.produit_id === produitChoisi)
    const qte = Number(quantite)
    const prixUnitaire = Number(prix)
    if (!produit || !qte || qte <= 0 || !Number.isFinite(prixUnitaire) || prixUnitaire < 0) return
    setCart((c) => [...c, { produit_id: produit.produit_id, produit_nom: produit.produit_nom, palier, quantite: qte, prix_unitaire: prixUnitaire }])
    setProduitChoisi('')
    setQuantite('1')
    setPalier('detail')
    setPalierManuel(false)
    setPrix('')
  }

  function changerPrixLigne(index: number, valeur: string) {
    const prixUnitaire = Number(valeur)
    setCart((c) => c.map((l, i) => (i === index ? { ...l, prix_unitaire: Number.isFinite(prixUnitaire) ? prixUnitaire : 0 } : l)))
  }

  const totalCart = cart.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0)
  const totalCatalogueCart = cart.reduce((s, l) => {
    const ligne = stock.find((x) => x.produit_id === l.produit_id)
    return s + (ligne ? prixPourPalier(ligne, l.palier) : l.prix_unitaire) * l.quantite
  }, 0)
  const remisePct = totalCatalogueCart > 0 ? (totalCatalogueCart - totalCart) / totalCatalogueCart : 0
  const remiseDepasseSeuil = remisePct > SEUIL_REMISE

  async function handleSubmit() {
    const client = clients.find((c) => c.id === clientId)
    if (!client || cart.length === 0) {
      setError('Sélectionnez un client et au moins un article.')
      return
    }
    if (remiseDepasseSeuil && !remiseMotif.trim()) {
      setError(`Motif obligatoire pour une remise supérieure à ${Math.round(SEUIL_REMISE * 100)} % du prix catalogue.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const commande = await api.creerCommandeClient({
        client_nom: client.nom,
        boutique_id: boutiqueId,
        canal: 'boutique',
        mode_paiement: modePaiement,
        statut: 'en_attente',
        articles: cart.map((l) => ({ produit_id: l.produit_id, quantite: l.quantite, palier: l.palier, prix_unitaire: l.prix_unitaire })),
        remise_motif: remiseDepasseSeuil ? remiseMotif.trim() : null,
      })
      setCreating(false)
      refresh()
      if (commande.remise_statut === 'en_attente') {
        Alert.alert(
          'Commande enregistrée — remise en attente',
          `Commande #${commande.id} créée. Cette remise dépasse ${Math.round(SEUIL_REMISE * 100)} % et doit être validée par un gérant ou le siège avant que la commande puisse être livrée.`,
        )
      } else {
        Alert.alert('Commande créée', `Commande #${commande.id} enregistrée.`)
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Échec de la création de la commande.')
    } finally {
      setSaving(false)
    }
  }

  async function validerRemise(id: string) {
    setValidatingId(id)
    try {
      await api.validerRemiseCommandeClient(id)
      refresh()
      Alert.alert('Remise validée', `La remise de la commande #${id} est validée.`)
    } catch (e) {
      Alert.alert('Échec de la validation', e instanceof Error && e.message ? e.message : 'Réessayez plus tard.')
    } finally {
      setValidatingId(null)
    }
  }

  async function imprimerTicket(id: string) {
    setPrintingId(id)
    try {
      await imprimerOuPartagerDocument(`/commandes-clients/${id}/facture.pdf`)
    } catch (e) {
      Alert.alert('Échec', e instanceof Error && e.message ? e.message : "Impossible d'imprimer le ticket.")
    } finally {
      setPrintingId(null)
    }
  }

  async function changerStatut(id: string, statut: StatutCommandeClient) {
    setChangingStatutId(id)
    try {
      await api.modifierStatutCommandeClient(id, statut)
      refresh()
      Alert.alert('Statut mis à jour', `Commande #${id} → ${STATUT_LABEL[statut]}.`)
    } catch (e) {
      Alert.alert('Action impossible', e instanceof Error && e.message ? e.message : 'Réessayez plus tard.')
    } finally {
      setChangingStatutId(null)
    }
  }

  return (
    <Screen title="Commandes" onRefresh={refresh} refreshing={loading} error={loadError}>
      {boutiques.length > 1 && (
        <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
      )}

      {!creating ? (
        <Button label="Nouvelle commande client" variant="dashed" icon="add-circle-outline" onPress={openCreate} />
      ) : (
        <Card style={styles.formCard}>
          <PickerField
            label="Client"
            value={clientId}
            onChange={setClientId}
            options={clients.map((c) => ({ value: c.id, label: `${c.nom} — ${c.contact}` }))}
            placeholder={clients.length ? 'Sélectionner…' : 'Aucun client enregistré'}
          />
          <PickerField label="Mode de paiement" value={modePaiement} onChange={(v) => setModePaiement(v as ModePaiement)} options={MODE_OPTIONS} searchable={false} />

          <Text style={styles.sub}>Produits</Text>
          <PickerField
            label="Produit"
            value={produitChoisi}
            onChange={choisirProduit}
            options={stock.map((s) => ({ value: s.produit_id, label: `${s.produit_nom} (${s.quantite_disponible} dispo.)` }))}
          />
          <View style={styles.addRow}>
            <View style={styles.qteField}>
              <TextField label="Quantité" value={quantite} onChangeText={changerQuantiteFormulaire} keyboardType="numeric" />
            </View>
            <View style={styles.qteField}>
              <TextField label="Prix unit. (GNF)" value={prix} onChangeText={changerPrixFormulaire} keyboardType="numeric" />
            </View>
          </View>
          <PickerField label="Palier de prix" value={palier} onChange={changerPalierFormulaire} options={PALIER_OPTIONS_PICKER} searchable={false} />
          <Button label="Ajouter au panier" variant="outline" icon="add" onPress={ajouterArticle} />

          {cart.map((l, i) => (
            <View key={i} style={styles.cartRow}>
              <View style={styles.cartRowTop}>
                <Text style={styles.cartText}>{l.produit_nom} × {l.quantite} · {PALIER_PRIX_LABELS[l.palier]}</Text>
                <Pressable onPress={() => setCart((c) => c.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.danger} />
                </Pressable>
              </View>
              <View style={styles.cartRowBottom}>
                <View style={styles.prixEditWrap}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.inkMuted} />
                  <TextInput
                    value={String(l.prix_unitaire)}
                    onChangeText={(v) => changerPrixLigne(i, v)}
                    keyboardType="numeric"
                    style={styles.prixEditInput}
                  />
                  <Text style={styles.cartMeta}>GNF / unité</Text>
                </View>
                <Text style={styles.cartLineTotal}>{formatGNF(l.prix_unitaire * l.quantite)}</Text>
              </View>
            </View>
          ))}
          {cart.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatGNF(totalCart)}</Text>
            </View>
          )}

          {remiseDepasseSeuil && (
            <View style={styles.remiseAlert}>
              <View style={styles.remiseAlertHeader}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.remiseAlertTitle}>Remise de {Math.round(remisePct * 100)} % — validation requise</Text>
              </View>
              <Text style={styles.remiseAlertText}>
                Au-delà de {Math.round(SEUIL_REMISE * 100)} % sous le prix catalogue, un motif est obligatoire et la commande restera en
                attente de validation par un gérant ou le siège avant de pouvoir être livrée.
              </Text>
              <TextField label="Motif de la remise" value={remiseMotif} onChangeText={setRemiseMotif} placeholder="Ex : négociation directeur boutique" />
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actionsRow}>
            <View style={styles.actionFlex}>
              <Button label="Annuler" variant="outline" onPress={() => setCreating(false)} />
            </View>
            <View style={styles.actionFlex}>
              <Button label="Créer" onPress={handleSubmit} loading={saving} />
            </View>
          </View>
        </Card>
      )}

      {commandes.map((c) => (
        <Card key={c.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="receipt-outline" size={16} color={colors.tealDark} />
              </View>
              <Text style={styles.nom}>{c.client_nom}</Text>
            </View>
            <Badge label={STATUT_LABEL[c.statut]} tone={STATUT_TONE[c.statut]} />
          </View>
          <Text style={styles.meta}>#{c.id} · {MODE_PAIEMENT_LABELS[c.mode_paiement]} · {formatGNF(c.montant)}</Text>
          <Button
            label="Imprimer le ticket"
            variant="outline"
            icon="print-outline"
            onPress={() => imprimerTicket(c.id)}
            loading={printingId === c.id}
          />
          {canGererCommande && c.statut !== 'livree' && c.statut !== 'annulee' && (
            <View style={changingStatutId === c.id ? styles.statutPickerBusy : undefined}>
              <PickerField
                label="Statut"
                value={c.statut}
                onChange={(v) => changerStatut(c.id, v as StatutCommandeClient)}
                options={STATUT_OPTIONS}
                searchable={false}
              />
            </View>
          )}
          {c.remise_statut === 'en_attente' && (
            <View style={styles.remiseRow}>
              <View style={styles.remiseBadge}>
                <Ionicons name="pricetag" size={12} color={colors.warning} />
                <Text style={styles.remiseBadgeText}>Remise en attente de validation</Text>
              </View>
              {remiseValidation && (
                <Button label="Valider" variant="outline" icon="checkmark-circle-outline" onPress={() => validerRemise(c.id)} loading={validatingId === c.id} />
              )}
            </View>
          )}
        </Card>
      ))}
      {commandes.length === 0 && <Text style={styles.empty}>{loading ? 'Chargement…' : 'Aucune commande.'}</Text>}
    </Screen>
  )
}

const styles = StyleSheet.create({
  formCard: { gap: spacing.md },
  sub: { fontSize: 13, fontWeight: '700', color: colors.inkMuted2, marginTop: spacing.xs },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  qteField: { flex: 1 },
  cartRow: { gap: 6, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  cartRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartRowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartText: { fontSize: 14, color: colors.ink },
  cartMeta: { fontSize: 12, color: colors.inkMuted },
  prixEditWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.buttonSm, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.card },
  prixEditInput: { fontSize: 13, color: colors.ink, minWidth: 56, padding: 0 },
  cartLineTotal: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  totalValue: { fontSize: 17, fontWeight: '800', color: colors.ink },
  error: { color: colors.danger, fontSize: 13 },
  remiseAlert: { gap: spacing.sm, backgroundColor: colors.warningBg, borderRadius: radius.card, padding: spacing.md, borderWidth: 1, borderColor: colors.warning },
  remiseAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remiseAlertTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  remiseAlertText: { fontSize: 12.5, color: colors.inkMuted2, lineHeight: 17 },
  statutPickerBusy: { opacity: 0.5 },
  remiseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 },
  remiseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  remiseBadgeText: { fontSize: 11.5, fontWeight: '600', color: colors.warning, flexShrink: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionFlex: { flex: 1 },
  card: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  nom: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 12.5, color: colors.inkMuted },
  empty: { textAlign: 'center', color: colors.inkMuted, marginVertical: spacing.md },
})
