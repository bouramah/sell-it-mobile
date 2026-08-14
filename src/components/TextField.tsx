import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import { colors, radius, spacing } from '../lib/theme'

interface TextFieldProps {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
}: TextFieldProps) {
  // Masqué par défaut dès que secureTextEntry est demandé ; le bouton œil permet de
  // révéler ponctuellement (ex. vérifier une saisie avant de valider un mot de passe).
  const [revealed, setRevealed] = useState(false)

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, secureTextEntry ? styles.inputWithIcon : null]}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={10} style={styles.eyeButton}>
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.inkMuted2 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  inputWithIcon: { paddingRight: 42 },
  eyeButton: { position: 'absolute', right: 12, padding: 2 },
})
