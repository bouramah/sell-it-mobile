export function formatGNF(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} GNF`
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Il y a ${h} h`
  const d = Math.round(h / 24)
  return `Il y a ${d} j`
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
