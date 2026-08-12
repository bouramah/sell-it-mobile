import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ActivityIndicator, View } from 'react-native'
import CaisseScreen from '../screens/CaisseScreen'
import CommandesScreen from '../screens/CommandesScreen'
import LivraisonsScreen from '../screens/LivraisonsScreen'
import LoginScreen from '../screens/LoginScreen'
import ProfilScreen from '../screens/ProfilScreen'
import StockScreen from '../screens/StockScreen'
import { useAuth } from '../lib/AuthContext'
import { PermissionsProvider, usePermissions } from '../lib/permissions'
import { colors } from '../lib/theme'

const AuthStack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  )
}

function MainTabs() {
  const { role, caisseGestion, commandeClient } = usePermissions()
  const estLivreur = role === 'livreur'

  return (
    <Tabs.Navigator
      screenOptions={{
        headerTintColor: colors.slate900,
        tabBarActiveTintColor: colors.teal700,
        tabBarInactiveTintColor: colors.slate400,
      }}
    >
      {!estLivreur && <Tabs.Screen name="Stock" component={StockScreen} options={{ title: 'Stock' }} />}
      {!estLivreur && caisseGestion && <Tabs.Screen name="Caisse" component={CaisseScreen} options={{ title: 'Caisse' }} />}
      {!estLivreur && commandeClient && <Tabs.Screen name="Commandes" component={CommandesScreen} options={{ title: 'Commandes' }} />}
      <Tabs.Screen name="Livraisons" component={LivraisonsScreen} options={{ title: 'Livraisons' }} />
      <Tabs.Screen name="Profil" component={ProfilScreen} options={{ title: 'Profil' }} />
    </Tabs.Navigator>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 }}>
        <ActivityIndicator color={colors.teal700} size="large" />
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
