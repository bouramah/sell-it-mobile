import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from '../api/client'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/** Demande la permission puis enregistre le token push Expo de l'appareil auprès du
 * backend. Best-effort et entièrement silencieux : sans projectId EAS configuré (ex.
 * `eas init` pas encore lancé) ou sur simulateur, on abandonne proprement sans jamais
 * bloquer ni perturber la connexion — cf. services/push.py côté backend, même philosophie. */
export async function enregistrerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) {
      console.warn('[push] Aucun projectId EAS configuré (app.json extra.eas.projectId) — notifications push désactivées.')
      return
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await api.enregistrerPushToken(token)
  } catch (e) {
    console.warn('[push] Échec de l\'enregistrement du token push :', e)
  }
}

/** Efface le token push côté serveur à la déconnexion, pour ne pas notifier un
 * appareil qui n'est plus rattaché à ce compte. Best-effort, ne bloque jamais la
 * déconnexion. */
export async function desinscrirePushToken(): Promise<void> {
  try {
    await api.enregistrerPushToken(null)
  } catch {
    // Non bloquant : la déconnexion locale reste effective même si l'appel échoue.
  }
}
