import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, spacing } from '../lib/theme'

export interface PickerOption {
  value: string
  label: string
}

interface PickerFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: PickerOption[]
  placeholder?: string
  searchable?: boolean
}

export default function PickerField({ label, value, onChange, options, placeholder = 'Sélectionner…', searchable = true }: PickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((o) => o.value === value)
  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.value : styles.placeholder}>{selected ? selected.label : placeholder}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {searchable && (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher…"
                placeholderTextColor={colors.slate400}
                style={styles.search}
                autoFocus
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.value === value && styles.optionSelected]}
                  onPress={() => {
                    onChange(item.value)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>{item.label}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Aucun résultat.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate600 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  value: { fontSize: 15, color: colors.slate900 },
  placeholder: { fontSize: 15, color: colors.slate400 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg, maxHeight: '75%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900, marginBottom: spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  list: { marginBottom: spacing.md },
  option: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 6 },
  optionSelected: { backgroundColor: colors.tealBg },
  optionText: { fontSize: 15, color: colors.slate900 },
  optionTextSelected: { color: colors.teal800, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.slate400, paddingVertical: spacing.lg },
})
