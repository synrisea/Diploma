import '../global.css';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { IBMPlexSerif_400Regular, IBMPlexSerif_500Medium } from '@expo-google-fonts/ibm-plex-serif';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { HeatmapProvider } from '@/heatmap/HeatmapContext';
import { RouteProvider } from '@/route/RouteContext';
import { GrainOverlay } from '@/components/layout/GrainOverlay';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function Gate({ fontsLoaded, children }: { fontsLoaded: boolean; children: ReactNode }) {
  const { isHydrated, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const ready = fontsLoaded && isHydrated;

  usePushNotifications();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated && pathname === '/') router.replace('/login');
    const frame = requestAnimationFrame(() => void SplashScreen.hideAsync());
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  if (!ready) return <View className="flex-1 bg-ground" />;

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSerif_400Regular,
    IBMPlexSerif_500Medium,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ground }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <HeatmapProvider>
              <RouteProvider>
                <BottomSheetModalProvider>
                  <StatusBar style="light" />
                  <Gate fontsLoaded={fontsLoaded}>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.ground },
                        animation: 'slide_from_right',
                      }}
                    >
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="login" options={{ animation: 'fade' }} />
                      <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
                    </Stack>
                  </Gate>
                  <GrainOverlay />
                </BottomSheetModalProvider>
              </RouteProvider>
            </HeatmapProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
