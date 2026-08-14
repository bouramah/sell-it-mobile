import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import AccueilScreen from '../screens/AccueilScreen'
import CaisseScreen from '../screens/CaisseScreen'
import CommandesScreen from '../screens/CommandesScreen'
import LivraisonsScreen from '../screens/LivraisonsScreen'
import LoginScreen from '../screens/LoginScreen'
import PlusScreen from '../screens/PlusScreen'
import Screen from '../components/Screen'
import StockScreen from '../screens/StockScreen'
import { useAuth } from '../lib/AuthContext'
import { PermissionsProvider, usePermissions } from '../lib/permissions'
import { colors } from '../lib/theme'

const AuthStack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accueil: 'home',
  Caisse: 'cash',
  Stock: 'cube',
  Commandes: 'receipt',
  Livraisons: 'bicycle',
  Plus: 'ellipsis-horizontal-circle',
}
const TAB_ICONS_OUTLINE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accueil: 'home-outline',
  Caisse: 'cash-outline',
  Stock: 'cube-outline',
  Commandes: 'receipt-outline',
  Livraisons: 'bicycle-outline',
  Plus: 'ellipsis-horizontal-circle-outline',
}

function tabIcon(routeName: string) {
  return ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? TAB_ICONS[routeName] : TAB_ICONS_OUTLINE[routeName]} size={size} color={color} />
  )
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  )
}

function LivreurLivraisonsTab() {
  return (
    <Screen title="Mes livraisons">
      <LivraisonsScreen />
    </Screen>
  )
}

function MainTabs() {
  const { role, caisseGestion, commandeClient } = usePermissions()
  const estLivreur = role === 'livreur'

  const screenOptions = ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.teal,
    tabBarInactiveTintColor: colors.inkMuted2,
    tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder, height: 58, paddingBottom: 6, paddingTop: 6 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
    tabBarIcon: tabIcon(route.name),
  })

  if (estLivreur) {
    return (
      <Tabs.Navigator screenOptions={screenOptions}>
        <Tabs.Screen name="Livraisons" component={LivreurLivraisonsTab} options={{ title: 'Livraisons' }} />
        <Tabs.Screen name="Plus" component={PlusScreen} options={{ title: 'Plus' }} />
      </Tabs.Navigator>
    )
  }

  return (
    <Tabs.Navigator screenOptions={screenOptions}>
      <Tabs.Screen name="Accueil" component={AccueilScreen} options={{ title: 'Accueil' }} />
      {caisseGestion && <Tabs.Screen name="Caisse" component={CaisseScreen} options={{ title: 'Caisse' }} />}
      <Tabs.Screen name="Stock" component={StockScreen} options={{ title: 'Stock' }} />
      {commandeClient && <Tabs.Screen name="Commandes" component={CommandesScreen} options={{ title: 'Commandes' }} />}
      <Tabs.Screen name="Plus" component={PlusScreen} options={{ title: 'Plus' }} />
    </Tabs.Navigator>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page }}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    )
  }

  return user ? <MainTabs /> : <AuthNavigator />
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <PermissionsProvider>
        <AppContent />
      </PermissionsProvider>
    </NavigationContainer>
  )
}
