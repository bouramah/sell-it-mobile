import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius } from '../lib/theme'

export type ButtonVariant = 'primary' | 'outline' | 'outlineDanger' | 'dashed' | 'danger' | 'success'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}

const VARIANT_STYLE: Record<ButtonVariant, { bg: string; border?: string; text: string; borderStyle?: 'solid' | 'dashed' }> = {
  primary: { bg: colors.teal, text: colors.white },
  outline: { bg: 'transparent', border: colors.tealBorder, text: colors.teal },
  outlineDanger: { bg: 'transparent', border: colors.dangerBorder, text: colors.danger },
  dashed: { bg: 'transparent', border: colors.tealDashed, text: colors.teal, borderStyle: 'dashed' },
  danger: { bg: colors.danger, text: colors.white },
  success: { bg: colors.greenSolid, text: colors.white },
}

export default function Button({ label, onPress, variant = 'primary', disabled, loading, icon }: ButtonProps) {
  const isDisabled = disabled || loading
  const v = VARIANT_STYLE[variant]
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? (v.borderStyle === 'dashed' ? 1.5 : 1) : 0,
          borderStyle: v.borderStyle ?? 'solid',
        },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={16} color={v.text} />}
          <Text style={[styles.label, { color: v.text }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { ...font.button },
})
