import { Directory, File, Paths } from 'expo-file-system'
import * as Print from 'expo-print'
import { isAvailableAsync, shareAsync } from 'expo-sharing'
import { getToken } from './auth'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000/api/v1'

/** Télécharge un PDF authentifié (facture, reçu…) puis ouvre le dialogue d'impression
 * natif (AirPrint/Android print) ; si l'impression échoue (imprimante absente, etc.),
 * retombe sur le partage classique (WhatsApp, email…) — l'utilisateur garde toujours
 * un moyen de remettre le document au client, cf. CDC §6.1 "ticket/reçu". */
export async function imprimerOuPartagerDocument(path: string): Promise<void> {
  const token = await getToken()
  const destination = new Directory(Paths.cache, 'documents')
  destination.create({ idempotent: true })
  const task = File.createDownloadTask(`${API_BASE}${path}`, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const file = await task.downloadAsync()
  if (!file) throw new Error('Échec du téléchargement du document.')

  try {
    await Print.printAsync({ uri: file.uri })
  } catch {
    if (await isAvailableAsync()) {
      await shareAsync(file.uri, { mimeType: 'application/pdf', UTI: '.pdf' })
    } else {
      throw new Error("Aucune imprimante ni application de partage disponible sur cet appareil.")
    }
  }
}
