import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { api } from '../api/client'
import { useAuth } from '../lib/AuthContext'
import { useMesBoutiques } from '../lib/useBoutiques'
import { colors, font, radius, spacing } from '../lib/theme'
import Button from './Button'
import TextField from './TextField'

function initiales(prenom?: string, nom?: string) {
  return `${(prenom ?? '?')[0] ?? ''}${(nom ?? '')[0] ?? ''}`.toUpperCase()
}

export default function Header({ title }: { title: string }) {
  const { user } = useAuth()
  const { boutiques, boutiqueId, setBoutiqueId } = useMesBoutiques()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const boutique = boutiques.find((b) => b.id === boutiqueId)

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={() => boutiques.length > 1 && setPickerOpen(true)} style={styles.switcher}>
          <Ionicons name="storefront" size={12} color={colors.teal} />
          <Text style={styles.switcherText}>{boutique?.nom ?? '—'}</Text>
          {boutiques.length > 1 && <Ionicons name="chevron-down" size={12} color={colors.teal} />}
        </Pressable>
        <Pressable onPress={() => setProfileOpen(true)} style={styles.avatar}>
          <Text style={styles.avatarText}>{initiales(user?.prenom, user?.nom)}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{title}</Text>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Choisir une boutique</Text>
            <FlatList
              data={boutiques}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.id === boutiqueId && styles.optionSelected]}
                  onPress={() => {
                    setBoutiqueId(item.id)
                    setPickerOpen(false)
                  }}
                >
                  <Text style={[styles.optionText, item.id === boutiqueId && styles.optionTextSelected]}>{item.nom}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  )
}

function ProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setChangingPassword(false)
    setActuel('')
    setNouveau('')
    setConfirmation('')
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!actuel || !nouveau) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    if (nouveau !== confirmation) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.changerMotDePasse(actuel, nouveau)
      setSuccess(true)
      setActuel('')
      setNouveau('')
      setConfirmation('')
      setChangingPassword(false)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Échec de la modification.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initiales(user?.prenom, user?.nom)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.prenom} {user?.nom}</Text>
              <Text style={styles.profileMeta}>{user?.role} · {user?.contact}</Text>
            </View>
          </View>

          {success && <Text style={styles.success}>Mot de passe modifié avec succès.</Text>}

          {!changingPassword ? (
            <Button label="Changer le mot de passe" variant="outline" icon="key-outline" onPress={() => { setSuccess(false); setChangingPassword(true) }} />
          ) : (
            <View style={styles.form}>
              <TextField label="Mot de passe actuel" value={actuel} onChangeText={setActuel} secureTextEntry autoCapitalize="none" />
              <TextField label="Nouveau mot de passe" value={nouveau} onChangeText={setNouveau} secureTextEntry autoCapitalize="none" />
              <TextField label="Confirmer le nouveau mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" />
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.formActions}>
                <View style={{ flex: 1 }}>
                  <Button label="Annuler" variant="outline" onPress={() => { setChangingPassword(false); setError(null) }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Enregistrer" onPress={handleSubmit} loading={saving} />
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switcher: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  switcherText: { color: colors.teal, fontSize: 11, fontWeight: '600' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.tealDark, fontSize: 11.5, fontWeight: '700' },
  title: { ...font.title, marginTop: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, maxHeight: '60%' },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  option: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  optionSelected: { backgroundColor: colors.tealLight },
  optionText: { fontSize: 15, color: colors.ink },
  optionTextSelected: { color: colors.tealDark, fontWeight: '600' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: colors.tealDark, fontSize: 15, fontWeight: '700' },
  profileName: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  profileMeta: { fontSize: 12.5, color: colors.inkMuted, marginTop: 2, textTransform: 'capitalize' },
  form: { gap: spacing.sm },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 13 },
  success: { color: colors.tealDark, fontSize: 13, marginBottom: spacing.sm },
})
