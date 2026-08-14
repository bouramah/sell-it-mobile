// Tokens extraits du prototype de référence :
// design/KFSTORE Mobile Interne (standalone).html — valeurs exactes (computed styles),
// pas d'approximation. Toute nouvelle UI doit puiser dans ces tokens.
export const colors = {
  // Marque
  teal: '#00858d',
  tealDark: '#00565d',
  tealLight: '#d9eced', // avatar, fonds teints
  tealBorder: '#9fdadd', // bouton outline teal
  tealDashed: '#5caeb2', // bouton en pointillés

  // Encre / texte
  ink: '#12120f',
  inkMuted: '#73716e',
  inkMuted2: '#646360',

  // Surfaces
  page: '#f3f2ef',
  card: '#ffffff',
  cardBorder: '#e5e4e2',
  inputBorder: '#dfdedb',

  // États
  success: '#298646',
  successBg: '#dcf7e1',
  warning: '#be7200',
  warningBg: '#ffefcd',
  danger: '#c13c3b',
  dangerBg: '#ffe8e4',
  dangerBorder: '#ffb4ad',
  greenSolid: '#137738', // bouton plein (ex. confirmer réception transfert)

  white: '#ffffff',
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }

export const radius = { card: 12, button: 10, buttonSm: 8, input: 10, pill: 999 }

export const font = {
  title: { fontSize: 16, fontWeight: '700' as const, color: colors.ink },
  statValue: { fontSize: 18, fontWeight: '700' as const, color: colors.ink },
  statLabel: { fontSize: 11, fontWeight: '400' as const, color: colors.inkMuted },
  badge: { fontSize: 10.5, fontWeight: '600' as const },
  button: { fontSize: 13.5, fontWeight: '700' as const },
  tab: { fontSize: 10, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.ink },
  bodyMuted: { fontSize: 12.5, fontWeight: '400' as const, color: colors.inkMuted },
}
