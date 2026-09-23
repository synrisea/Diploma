import { Tabs } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { TabBar } from '@/components/layout/TabBar';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  const authedOnly = isAuthenticated ? undefined : null;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.ground },
        lazy: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', href: authedOnly }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', href: authedOnly }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans', href: authedOnly }} />
    </Tabs>
  );
}
