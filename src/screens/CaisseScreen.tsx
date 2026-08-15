import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import OfflineBanner from '../components/OfflineBanner'
import PickerField from '../components/PickerField'
import Screen from '../components/Screen'
import TextField from '../components/TextField'
import { ApiError, api } from '../api/client'
import { useAuth } from '../lib/AuthContext'
import { imprimerOuPartagerDocument } from '../lib/documents'
import {
  ajouterVenteEnAttente,
  mettreEnCacheProduits,
  mettreEnCacheStock,
  modeHorsLigneActif,
  produitsEnCache,
  rafraichirModeHorsLigne,
  stockEnCache,
  synchroniserVentes,
  useConnectivite,
  ventesEnAttente,
} from '../lib/offline'
import { usePermissions } from '../lib/permissions'
import { useMesBoutiques } from '../lib/useBoutiques'
import { formatGNF } from '../lib/format'
import { colors, radius, spacing } from '../lib/theme'
import {
  MODE_PAIEMENT_LABELS,
  PALIER_PRIX_LABELS,
  palierSuggere,
  prixPourPalier,
  type Caisse,
  type Client,
  type LigneStock,
  type ModePaiement,
  type PalierPrix,
  type Produit,
  type StatutCaisse,
} from '../types'

const MODE_OPTIONS = (Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[]).map((m) => ({ value: m, label: MODE_PAIEMENT_LABELS[m] }))

const STATUT_TONE: Record<StatutCaisse, 'default' | 'success' | 'danger'> = {
  ouverte: 'success',
  fermee: 'default',
  ecart_signale: 'danger',
}
const STATUT_LABEL: Record<StatutCaisse, string> = { ouverte: 'Ouverte', fermee: 'Fermée', ecart_signale: 'Écart signalé' }

// Au-delà de cette remise (part du prix catalogue non facturée), un motif devient obligatoire
// et la vente reste bloquée en attente de validation gérant/siège — le backend est la seule
// source de vérité (recalcule et refuse si absent), ceci n'est qu'un garde-fou côté UI.
const SEUIL_REMISE = 0.10

const PALIER_OPTIONS: PalierPrix[] = ['detail', 'semi_gros', 'gros']

interface CartLine {
  produit_id: string
  produit_nom: string
  palier: PalierPrix
  /** true dès que le vendeur a choisi le palier ou le prix à la main — la quantité ne le
   * réajuste alors plus automatiquement (on ne veut pas effacer un choix explicite). */
  palierManuel: boolean
  prix_unitaire: number
  quantite: number
}

/** Ajuste la quantité d'une ligne ; si son palier n'a pas été choisi à la main, le palier et le
 * prix suivent automatiquement la nouvelle quantité (cf. seuils du produit). */
function ajusterQuantiteLigne(ligne: CartLine, produit: Produit | undefined, stockLigne: LigneStock | undefined, nouvelleQuantite: number): CartLine {
  if (ligne.palierManuel || !produit) return { ...ligne, quantite: nouvelleQuantite }
  // Le palier suit toujours la quantité (seuils définis au niveau du produit) — le prix, lui,
  // dépend du stock de la boutique et peut être indisponible si la ligne de stock a disparu.
  const palier = palierSuggere(nouvelleQuantite, produit)
  return { ...ligne, quantite: nouvelleQuantite, palier, prix_unitaire: stockLigne ? prixPourPalier(stockLigne, palier) : ligne.prix_unitaire }
}

export default function CaisseScreen() {
  const { user } = useAuth()
  const { caisseOuverture, caisseMouvement, venteDirecte } = usePermissions()
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [selectedCaisseId, setSelectedCaisseId] = useState('')
  const [produits, setProduits] = useState<Produit[]>([])
  const [stock, setStock] = useState<LigneStock[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [modePaiement, setModePaiement] = useState<ModePaiement>('especes')
  const [remiseMotif, setRemiseMotif] = useState('')
  const [query, setQuery] = useState('')
  const [vue, setVue] = useState<'produits' | 'panier'>('produits')
  const [cart, setCart] = useState<CartLine[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [encaissement, setEncaissement] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finalisation, setFinalisation] = useState(false)

  const [openingCaisse, setOpeningCaisse] = useState(false)
  const [libelle, setLibelle] = useState('')
  const [fondInitial, setFondInitial] = useState('')
  const [closingCaisse, setClosingCaisse] = useState(false)
  const [soldeReel, setSoldeReel] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [mouvementOuvert, setMouvementOuvert] = useState(false)
  const [mouvementType, setMouvementType] = useState<'encaissement' | 'decaissement'>('decaissement')
  const [mouvementMotif, setMouvementMotif] = useState('')
  const [mouvementMontant, setMouvementMontant] = useState('')

  const [modeHorsLigne, setModeHorsLigne] = useState(false)
  const [enAttente, setEnAttente] = useState(0)
  const [synchronisation, setSynchronisation] = useState(false)
  const connecte = useConnectivite()

  const operateur = user ? `${user.prenom} ${user.nom}` : ''

  const refresh = useCallback(() => {
    if (!boutiqueId) return
    setLoading(true)
    Promise.all([api.caisses(boutiqueId), api.produits(), api.stock(boutiqueId), api.clients(boutiqueId)])
      .then(async ([c, p, s, cl]) => {
        setCaisses(c)
        setProduits(p)
        setStock(s)
        setClients(cl)
        setSelectedCaisseId((current) => (current && c.some((x) => x.id === current) ? current : (c[0]?.id ?? '')))
        setLoadError(null)
        if (await modeHorsLigneActif()) {
          mettreEnCacheStock(boutiqueId, s)
          mettreEnCacheProduits(p)
        }
      })
      .catch(async (e) => {
        // Hors-ligne avec le mode activé : on retombe sur la dernière photo connue du stock
        // et des produits plutôt que de laisser l'écran vide (CDC §3.7/§6.1 — consultation
        // du stock en mode dégradé). Les caisses et clients, eux, ne sont pas mis en cache
        // (la vente hors-ligne réutilise juste la caisse déjà sélectionnée).
        if (!(e instanceof ApiError) && (await modeHorsLigneActif())) {
          const [s, p] = await Promise.all([stockEnCache(boutiqueId), produitsEnCache()])
          if (s.length || p.length) {
            setStock(s)
            setProduits(p)
            setLoadError(null)
            return
          }
        }
        setLoadError(e instanceof Error && e.message ? e.message : 'Échec du chargement.')
      })
      .finally(() => setLoading(false))
  }, [boutiqueId])

  useEffect(refresh, [refresh])
  useEffect(() => {
    setCart([])
    setClientId('')
  }, [boutiqueId])

  useEffect(() => {
    rafraichirModeHorsLigne().then(setModeHorsLigne)
    ventesEnAttente().then((v) => setEnAttente(v.length))
  }, [])

  const synchroniser = useCallback(async () => {
    setSynchronisation(true)
    try {
      const resultat = await synchroniserVentes()
      setEnAttente(resultat.restantes)
      if (resultat.synchronisees > 0) refresh()
      if (resultat.erreur) {
        Alert.alert(
          'Synchronisation incomplète',
          `${resultat.synchronisees} vente(s) synchronisée(s). ${resultat.restantes} en attente — ${resultat.erreur}`,
        )
      } else if (resultat.synchronisees > 0) {
        Alert.alert('Synchronisation terminée', `${resultat.synchronisees} vente(s) hors-ligne synchronisée(s).`)
      }
    } finally {
      setSynchronisation(false)
    }
  }, [refresh])

  // Synchronisation automatique dès le retour du réseau, sans action de l'opérateur (CDC §3.7/§8).
  useEffect(() => {
    if (connecte && enAttente > 0) synchroniser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte])

  const selectedCaisse = caisses.find((c) => c.id === selectedCaisseId)

  const produitsAvecStock = stock
    .map((s) => ({ ...s, produit: produits.find((p) => p.id === s.produit_id) }))
    .filter((s) => s.produit && s.produit.nom.toLowerCase().includes(query.toLowerCase()))

  function ajouterAuPanier(ligne: LigneStock, produit: Produit | undefined) {
    setCart((c) => {
      const existing = c.find((l) => l.produit_id === ligne.produit_id)
      if (existing) return c.map((l) => (l.produit_id === ligne.produit_id ? ajusterQuantiteLigne(l, produit, ligne, l.quantite + 1) : l))
      const palier = produit ? palierSuggere(1, produit) : 'detail'
      return [...c, { produit_id: ligne.produit_id, produit_nom: ligne.produit_nom, palier, palierManuel: false, prix_unitaire: prixPourPalier(ligne, palier), quantite: 1 }]
    })
  }

  function changerQuantite(produitId: string, delta: number) {
    setCart((c) =>
      c
        .map((l) => {
          if (l.produit_id !== produitId) return l
          const produit = produits.find((p) => p.id === produitId)
          const ligneStock = stock.find((s) => s.produit_id === produitId)
          return ajusterQuantiteLigne(l, produit, ligneStock, l.quantite + delta)
        })
        .filter((l) => l.quantite > 0),
    )
  }

  function changerPrix(produitId: string, prix: string) {
    const valeur = Number(prix)
    setCart((c) => c.map((l) => (l.produit_id === produitId ? { ...l, palierManuel: true, prix_unitaire: Number.isFinite(valeur) ? valeur : 0 } : l)))
  }

  function changerPalier(produitId: string, palier: PalierPrix) {
    const ligne = stock.find((s) => s.produit_id === produitId)
    if (!ligne) return
    setCart((c) => c.map((l) => (l.produit_id === produitId ? { ...l, palier, palierManuel: true, prix_unitaire: prixPourPalier(ligne, palier) } : l)))
  }

  const total = cart.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0)
  const nbArticles = cart.reduce((s, l) => s + l.quantite, 0)
  const totalCatalogue = cart.reduce((s, l) => {
    const ligne = stock.find((x) => x.produit_id === l.produit_id)
    return s + (ligne ? prixPourPalier(ligne, l.palier) : l.prix_unitaire) * l.quantite
  }, 0)
  const remisePct = totalCatalogue > 0 ? (totalCatalogue - total) / totalCatalogue : 0
  const remiseDepasseSeuil = remisePct > SEUIL_REMISE

  async function handleOuvrir() {
    if (!libelle || !fondInitial) {
      setModalError('Renseignez le libellé et le fond de caisse.')
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      await api.creerCaisse({ boutique_id: boutiqueId, libelle, fond_initial: Number(fondInitial), operateur })
      setOpeningCaisse(false)
      setLibelle('')
      setFondInitial('')
      refresh()
      Alert.alert('Caisse ouverte', `"${libelle}" est prête pour l'encaissement.`)
    } catch (e) {
      setModalError(e instanceof Error && e.message ? e.message : "Échec de l'ouverture de caisse.")
    } finally {
      setSaving(false)
    }
  }

  async function handleFermer() {
    if (!selectedCaisse || !soldeReel) {
      setModalError('Renseignez le solde compté.')
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      const fermee = await api.fermerCaisse(selectedCaisse.id, Number(soldeReel))
      setClosingCaisse(false)
      setSoldeReel('')
      refresh()
      if (fermee.statut === 'ecart_signale') {
        Alert.alert('Caisse fermée — écart constaté', 'Le solde compté ne correspond pas au solde théorique. Un écart a été signalé.')
      } else {
        Alert.alert('Caisse fermée', 'Le solde compté correspond au solde théorique.')
      }
    } catch (e) {
      setModalError(e instanceof Error && e.message ? e.message : 'Échec de la fermeture de caisse.')
    } finally {
      setSaving(false)
    }
  }

  function handleRouvrir() {
    if (!selectedCaisse) return
    Alert.alert('Rouvrir la caisse', `Rouvrir "${selectedCaisse.libelle}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rouvrir',
        onPress: () =>
          api
            .rouvrirCaisse(selectedCaisse.id)
            .then(() => {
              refresh()
              Alert.alert('Caisse rouverte', `"${selectedCaisse.libelle}" est de nouveau ouverte.`)
            })
            .catch((e) => Alert.alert('Échec', e instanceof Error && e.message ? e.message : 'Réessayez plus tard.')),
      },
    ])
  }

  function openMouvement() {
    setMouvementType('decaissement')
    setMouvementMotif('')
    setMouvementMontant('')
    setModalError(null)
    setMouvementOuvert(true)
  }

  async function handleMouvement() {
    if (!selectedCaisse) return
    const montant = Number(mouvementMontant)
    if (!mouvementMotif.trim()) {
      setModalError('Renseignez le motif du mouvement.')
      return
    }
    if (!montant || montant <= 0) {
      setModalError('Le montant doit être positif.')
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      await api.creerMouvementCaisse({
        caisse_id: selectedCaisse.id, type: mouvementType, motif: mouvementMotif.trim(), operateur, montant,
      })
      setMouvementOuvert(false)
      refresh()
      Alert.alert('Mouvement enregistré', `${mouvementType === 'encaissement' ? 'Encaissement' : 'Décaissement'} de ${formatGNF(montant)}.`)
    } catch (e) {
      setModalError(e instanceof Error && e.message ? e.message : "Échec de l'enregistrement du mouvement.")
    } finally {
      setSaving(false)
    }
  }

  function openFinalisation() {
    if (!selectedCaisse || cart.length === 0) return
    setError(null)
    setRemiseMotif('')
    setFinalisation(true)
  }

  async function handleEncaisser() {
    if (!selectedCaisse || cart.length === 0) return
    if (remiseDepasseSeuil && !remiseMotif.trim()) {
      setError(`Motif obligatoire pour une remise supérieure à ${Math.round(SEUIL_REMISE * 100)} % du prix catalogue.`)
      return
    }
    setEncaissement(true)
    setError(null)
    const clientNom = clients.find((c) => c.id === clientId)?.nom ?? 'Client de passage'
    const payload = {
      client_nom: clientNom,
      boutique_id: boutiqueId,
      canal: 'boutique' as const,
      mode_paiement: modePaiement,
      statut: 'confirmee' as const,
      articles: cart.map((l) => ({ produit_id: l.produit_id, quantite: l.quantite, palier: l.palier, prix_unitaire: l.prix_unitaire })),
      remise_motif: remiseDepasseSeuil ? remiseMotif.trim() : null,
    }

    // Hors-ligne, mode activé : pas la peine d'attendre l'échec réseau, la vente est mise en
    // attente immédiatement (CDC §3.7/§8) — jamais pour une remise à valider, qui nécessite
    // le calcul serveur en direct sur les prix catalogue à jour.
    if (!connecte && modeHorsLigne && !remiseDepasseSeuil) {
      await ajouterVenteEnAttente({ caisseId: selectedCaisse.id, operateur, total, payload })
      setEnAttente((n) => n + 1)
      setCart([])
      setFinalisation(false)
      setEncaissement(false)
      Alert.alert('Vente enregistrée hors-ligne', 'Elle sera synchronisée automatiquement au retour du réseau.')
      return
    }

    try {
      const commande = await api.creerCommandeClient(payload)
      if (commande.remise_statut === 'en_attente') {
        setCart([])
        setFinalisation(false)
        setError(null)
        refresh()
        Alert.alert(
          'Vente enregistrée — remise en attente',
          `Commande #${commande.id} créée. Cette remise dépasse ${Math.round(SEUIL_REMISE * 100)} % et doit être validée par un gérant ou le siège avant que le stock et l'encaissement soient finalisés.`,
        )
        return
      }
      await api.modifierStatutCommandeClient(commande.id, 'livree')
      await api.creerMouvementCaisse({
        caisse_id: selectedCaisse.id,
        type: 'encaissement',
        motif: `Vente directe — #${commande.id}`,
        operateur,
        montant: total,
      })
      setCart([])
      setFinalisation(false)
      refresh()
      Alert.alert('Vente enregistrée', `Commande #${commande.id} — ${formatGNF(total)}`, [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Imprimer le ticket',
          onPress: () =>
            imprimerOuPartagerDocument(`/commandes-clients/${commande.id}/facture.pdf`).catch((e) =>
              Alert.alert('Échec', e instanceof Error && e.message ? e.message : "Impossible d'imprimer le ticket."),
            ),
        },
      ])
    } catch (e) {
      // Coupure réseau survenue pendant l'appel (pas une erreur métier renvoyée par le
      // serveur) : même filet de sécurité que le cas "déjà hors-ligne" ci-dessus.
      if (!(e instanceof ApiError) && modeHorsLigne && !remiseDepasseSeuil) {
        await ajouterVenteEnAttente({ caisseId: selectedCaisse.id, operateur, total, payload })
        setEnAttente((n) => n + 1)
        setCart([])
        setFinalisation(false)
        Alert.alert('Vente enregistrée hors-ligne', 'Connexion perdue pendant l’encaissement — la vente sera synchronisée automatiquement au retour du réseau.')
      } else {
        setError(e instanceof Error && e.message ? e.message : "Échec de l'encaissement.")
      }
    } finally {
      setEncaissement(false)
    }
  }

  return (
    <Screen
      title="Caisse"
      onRefresh={finalisation ? undefined : refresh}
      refreshing={loading}
      error={loadError}
      footer={
        selectedCaisse?.statut === 'ouverte' && cart.length > 0 ? (
          finalisation ? (
            <Button label="Confirmer l'encaissement" icon="checkmark-circle" onPress={handleEncaisser} loading={encaissement} />
          ) : (
            <Pressable style={styles.cartBar} onPress={openFinalisation}>
              <View style={styles.cartBarLeft}>
                <View style={styles.cartBadge}>
                  <Ionicons name="cart" size={16} color={colors.white} />
                  <Text style={styles.cartBadgeText}>{nbArticles}</Text>
                </View>
                <Text style={styles.cartBarTotal}>{formatGNF(total)}</Text>
              </View>
              <View style={styles.cartBarAction}>
                <Text style={styles.cartBarActionText}>Encaisser</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.white} />
              </View>
            </Pressable>
          )
        ) : undefined
      }
    >
      {!finalisation && (
        <OfflineBanner connecte={connecte} enAttente={enAttente} synchronisation={synchronisation} onSynchroniser={synchroniser} />
      )}
      {finalisation ? (
        <>
          <Pressable style={styles.backRow} onPress={() => setFinalisation(false)}>
            <Ionicons name="chevron-back" size={18} color={colors.teal} />
            <Text style={styles.backRowText}>Retour au panier</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Finaliser la vente</Text>

          <PickerField
            label="Client"
            value={clientId}
            onChange={setClientId}
            options={clients.map((c) => ({ value: c.id, label: `${c.nom} — ${c.contact}` }))}
            allowEmpty="Client de passage (anonyme)"
            placeholder="Client de passage (anonyme)"
          />
          <PickerField label="Mode de paiement" value={modePaiement} onChange={(v) => setModePaiement(v as ModePaiement)} options={MODE_OPTIONS} searchable={false} />

          <View style={styles.recap}>
            {cart.map((l) => (
              <View key={l.produit_id} style={styles.recapRow}>
                <Text style={styles.recapText}>{l.produit_nom} × {l.quantite} ({PALIER_PRIX_LABELS[l.palier]})</Text>
                <Text style={styles.recapText}>{formatGNF(l.prix_unitaire * l.quantite)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatGNF(total)}</Text>
            </View>
          </View>

          {remiseDepasseSeuil && (
            <View style={styles.remiseAlert}>
              <View style={styles.remiseAlertHeader}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.remiseAlertTitle}>Remise de {Math.round(remisePct * 100)} % — validation requise</Text>
              </View>
              <Text style={styles.remiseAlertText}>
                Au-delà de {Math.round(SEUIL_REMISE * 100)} % sous le prix catalogue, un motif est obligatoire et la vente restera en attente
                de validation par un gérant ou le siège avant que le stock et l'encaissement soient finalisés.
              </Text>
              <TextField label="Motif de la remise" value={remiseMotif} onChangeText={setRemiseMotif} placeholder="Ex : négociation directeur boutique" />
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      ) : (
        <>
          {boutiques.length > 1 && (
            <PickerField label="Boutique" value={boutiqueId} onChange={setBoutiqueId} options={boutiques.map((b) => ({ value: b.id, label: b.nom }))} />
          )}

          {caisses.length > 1 && (
            <View style={styles.segmented}>
              {caisses.map((c) => (
                <Pressable key={c.id} style={[styles.segment, selectedCaisseId === c.id && styles.segmentActive]} onPress={() => setSelectedCaisseId(c.id)}>
                  <Text style={[styles.segmentLabel, selectedCaisseId === c.id && styles.segmentLabelActive]}>{c.libelle}</Text>
                  <Text style={styles.segmentSub}>{STATUT_LABEL[c.statut]}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedCaisse ? (
            <Card style={styles.caisseCard}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="wallet-outline" size={18} color={colors.tealDark} />
                  </View>
                  <View>
                    <Text style={styles.soldeValue}>{formatGNF(selectedCaisse.solde_theorique)}</Text>
                    <Text style={styles.soldeLabel}>Solde théorique — {selectedCaisse.libelle}</Text>
                  </View>
                </View>
                <Badge label={STATUT_LABEL[selectedCaisse.statut]} tone={STATUT_TONE[selectedCaisse.statut]} />
              </View>
              {caisseOuverture &&
                (selectedCaisse.statut === 'ouverte' ? (
                  <Button label="Fermer la caisse" variant="outlineDanger" icon="lock-closed-outline" onPress={() => setClosingCaisse(true)} />
                ) : (
                  <Button label="Rouvrir la caisse" variant="outline" icon="lock-open-outline" onPress={handleRouvrir} />
                ))}
              {caisseMouvement && selectedCaisse.statut === 'ouverte' && (
                <Button label="Enregistrer un mouvement" variant="outline" icon="swap-vertical-outline" onPress={openMouvement} />
              )}
            </Card>
          ) : (
            <Card style={styles.caisseCard}>
              <Text style={styles.empty}>
                {caisseOuverture ? 'Aucune caisse pour cette boutique.' : "Aucune caisse ouverte. Demandez à un responsable de l'ouvrir."}
              </Text>
              {caisseOuverture && (
                <Button label="Ouvrir une caisse" variant="outline" icon="add-circle-outline" onPress={() => setOpeningCaisse(true)} />
              )}
            </Card>
          )}

          {selectedCaisse?.statut === 'ouverte' && venteDirecte && (
            <>
              <View style={styles.tabs}>
                <Pressable style={[styles.tab, vue === 'produits' && styles.tabActive]} onPress={() => setVue('produits')}>
                  <Ionicons name="pricetags-outline" size={15} color={vue === 'produits' ? colors.tealDark : colors.inkMuted} />
                  <Text style={[styles.tabLabel, vue === 'produits' && styles.tabLabelActive]}>Produits</Text>
                </Pressable>
                <Pressable style={[styles.tab, vue === 'panier' && styles.tabActive]} onPress={() => setVue('panier')}>
                  <Ionicons name="cart-outline" size={15} color={vue === 'panier' ? colors.tealDark : colors.inkMuted} />
                  <Text style={[styles.tabLabel, vue === 'panier' && styles.tabLabelActive]}>Panier{cart.length > 0 ? ` (${nbArticles})` : ''}</Text>
                </Pressable>
              </View>

              {vue === 'produits' ? (
                <>
                  <View style={styles.searchBox}>
                    <Ionicons name="search" size={16} color={colors.inkMuted} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Rechercher un produit…"
                      placeholderTextColor={colors.inkMuted}
                      style={styles.searchInput}
                    />
                  </View>

                  <Text style={styles.sectionLabel}>
                    PRODUITS{boutiques.find((b) => b.id === boutiqueId) ? ` — ${boutiques.find((b) => b.id === boutiqueId)!.nom.toUpperCase()}` : ''}
                  </Text>
                  {produitsAvecStock.slice(0, 30).map((s) => (
                    <Card key={s.produit_id} style={styles.productRow}>
                      <View style={styles.productTexts}>
                        <Text style={styles.productNom}>{s.produit!.nom}</Text>
                        <Text style={styles.productMeta}>{formatGNF(s.prix_detail)} détail · Dispo {s.quantite_disponible}</Text>
                      </View>
                      <Pressable style={styles.addBtn} onPress={() => ajouterAuPanier(s, s.produit)}>
                        <Ionicons name="add" size={18} color={colors.white} />
                      </Pressable>
                    </Card>
                  ))}
                  {produitsAvecStock.length === 0 && <Text style={styles.empty}>Aucun produit ne correspond à la recherche.</Text>}
                </>
              ) : (
                <>
                  {cart.length === 0 ? (
                    <Card style={styles.caisseCard}>
                      <Text style={styles.empty}>Le panier est vide.</Text>
                      <Button label="Ajouter des produits" variant="outline" icon="add-circle-outline" onPress={() => setVue('produits')} />
                    </Card>
                  ) : (
                    cart.map((l) => (
                      <View key={l.produit_id} style={styles.cartRow}>
                        <View style={styles.cartRowTop}>
                          <Text style={styles.productNom}>{l.produit_nom}</Text>
                          <View style={styles.stepper}>
                            <Pressable style={styles.stepBtn} onPress={() => changerQuantite(l.produit_id, -1)}>
                              <Ionicons name="remove" size={16} color={colors.ink} />
                            </Pressable>
                            <Text style={styles.stepValue}>{l.quantite}</Text>
                            <Pressable style={styles.stepBtn} onPress={() => changerQuantite(l.produit_id, 1)}>
                              <Ionicons name="add" size={16} color={colors.ink} />
                            </Pressable>
                          </View>
                        </View>
                        <View style={styles.palierRow}>
                          {PALIER_OPTIONS.map((p) => (
                            <Pressable
                              key={p}
                              style={[styles.palierChip, l.palier === p && styles.palierChipActive]}
                              onPress={() => changerPalier(l.produit_id, p)}
                            >
                              <Text style={[styles.palierChipText, l.palier === p && styles.palierChipTextActive]}>{PALIER_PRIX_LABELS[p]}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <View style={styles.cartRowBottom}>
                          <View style={styles.prixEditWrap}>
                            <Ionicons name="pricetag-outline" size={14} color={colors.inkMuted} />
                            <TextInput
                              value={String(l.prix_unitaire)}
                              onChangeText={(v) => changerPrix(l.produit_id, v)}
                              keyboardType="numeric"
                              style={styles.prixEditInput}
                            />
                            <Text style={styles.productMeta}>GNF / unité</Text>
                          </View>
                          <Text style={styles.cartLineTotal}>{formatGNF(l.prix_unitaire * l.quantite)}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Ouvrir / fermer une caisse / mouvement manuel — vraie Modal native, toujours au-dessus, quel que soit le défilement. */}
      <Modal
        visible={openingCaisse || closingCaisse || mouvementOuvert}
        transparent
        animationType="slide"
        onRequestClose={() => { setOpeningCaisse(false); setClosingCaisse(false); setMouvementOuvert(false) }}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => { setOpeningCaisse(false); setClosingCaisse(false); setMouvementOuvert(false); setModalError(null) }}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {openingCaisse && (
                <>
                  <Text style={styles.modalTitle}>Ouvrir une caisse</Text>
                  <TextField label="Libellé" value={libelle} onChangeText={setLibelle} placeholder="Ex : Caisse principale" />
                  <TextField label="Fond de caisse initial (GNF)" value={fondInitial} onChangeText={setFondInitial} keyboardType="numeric" />
                  {modalError && <Text style={styles.errorText}>{modalError}</Text>}
                  <Button label="Ouvrir" icon="lock-open-outline" onPress={handleOuvrir} loading={saving} />
                </>
              )}
              {closingCaisse && (
                <>
                  <Text style={styles.modalTitle}>Fermer {selectedCaisse?.libelle}</Text>
                  <TextField label="Solde réel compté (GNF)" value={soldeReel} onChangeText={setSoldeReel} keyboardType="numeric" />
                  {modalError && <Text style={styles.errorText}>{modalError}</Text>}
                  <Button label="Fermer la caisse" variant="outlineDanger" icon="lock-closed-outline" onPress={handleFermer} loading={saving} />
                </>
              )}
              {mouvementOuvert && (
                <>
                  <Text style={styles.modalTitle}>Mouvement de caisse manuel</Text>
                  <View style={styles.palierRow}>
                    <Pressable
                      style={[styles.palierChip, mouvementType === 'encaissement' && styles.palierChipActive]}
                      onPress={() => setMouvementType('encaissement')}
                    >
                      <Text style={[styles.palierChipText, mouvementType === 'encaissement' && styles.palierChipTextActive]}>Encaissement</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.palierChip, mouvementType === 'decaissement' && styles.palierChipActive]}
                      onPress={() => setMouvementType('decaissement')}
                    >
                      <Text style={[styles.palierChipText, mouvementType === 'decaissement' && styles.palierChipTextActive]}>Décaissement</Text>
                    </Pressable>
                  </View>
                  <TextField label="Motif" value={mouvementMotif} onChangeText={setMouvementMotif} placeholder="Ex : retrait pour achat fournitures" />
                  <TextField label="Montant (GNF)" value={mouvementMontant} onChangeText={setMouvementMontant} keyboardType="numeric" />
                  {modalError && <Text style={styles.errorText}>{modalError}</Text>}
                  <Button label="Enregistrer" icon="swap-vertical-outline" onPress={handleMouvement} loading={saving} />
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backRowText: { color: colors.teal, fontSize: 14, fontWeight: '600' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.card, padding: spacing.md, backgroundColor: colors.card },
  segmentActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  segmentLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  segmentLabelActive: { color: colors.tealDark },
  segmentSub: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  caisseCard: { gap: spacing.md },
  soldeValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
  soldeLabel: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.inkMuted },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.button, paddingVertical: 10, backgroundColor: colors.card },
  tabActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  tabLabel: { fontSize: 13.5, fontWeight: '600', color: colors.inkMuted },
  tabLabelActive: { color: colors.tealDark },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.inkMuted, letterSpacing: 0.3, marginTop: spacing.xs },
  productRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  productTexts: { flex: 1 },
  productNom: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  productMeta: { fontSize: 12.5, color: colors.inkMuted, marginTop: 2 },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  cartRow: { gap: 6, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  cartRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartRowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  palierRow: { flexDirection: 'row', gap: 6 },
  palierChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  palierChipActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  palierChipText: { fontSize: 12, fontWeight: '600', color: colors.inkMuted },
  palierChipTextActive: { color: colors.tealDark },
  prixEditWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.buttonSm, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.card },
  prixEditInput: { fontSize: 13, color: colors.ink, minWidth: 56, padding: 0 },
  cartLineTotal: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 15, fontWeight: '700', color: colors.ink, minWidth: 18, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
  totalValue: { fontSize: 19, fontWeight: '800', color: colors.ink },
  errorText: { color: colors.danger, fontSize: 13 },
  remiseAlert: { gap: spacing.sm, backgroundColor: colors.warningBg, borderRadius: radius.card, padding: spacing.md, borderWidth: 1, borderColor: colors.warning },
  remiseAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remiseAlertTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  remiseAlertText: { fontSize: 12.5, color: colors.inkMuted2, lineHeight: 17 },
  recap: { gap: 4, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.sm },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recapText: { fontSize: 13, color: colors.inkMuted },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  modalBody: { padding: spacing.lg, gap: spacing.md },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  cartBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.teal, borderRadius: radius.button, paddingVertical: 12, paddingHorizontal: 16 },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cartBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  cartBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  cartBarTotal: { color: colors.white, fontSize: 15, fontWeight: '800' },
  cartBarAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cartBarActionText: { color: colors.white, fontSize: 14, fontWeight: '700' },
})
