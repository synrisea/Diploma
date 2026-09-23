import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { onBeforeLogout, useAuth } from '../auth/AuthContext';
import { registerDevice, unregisterDevice } from '../api/connections';
import { colors } from '../theme/tokens';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.brand[500],
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

function conversationFromResponse(response: Notifications.NotificationResponse | null | undefined) {
  const data = response?.notification.request.content.data as Record<string, unknown> | undefined;
  const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : null;
  const withUserId = typeof data?.with === 'string' ? data.with : null;
  return conversationId && withUserId ? { conversationId, withUserId } : null;
}

export function usePushNotifications() {
  const { isAuthenticated, getValidAccessToken } = useAuth();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    registerForPushToken()
      .then(async (token) => {
        if (!token || cancelled) return;
        tokenRef.current = token;
        await registerDevice(await getValidAccessToken(), token, Platform.OS);
      })
      .catch((err) => console.warn('Push registration skipped:', err instanceof Error ? err.message : err));

    const unsubscribe = onBeforeLogout(async () => {
      const token = tokenRef.current;
      if (!token) return;
      tokenRef.current = null;
      await unregisterDevice(await getValidAccessToken(), token);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponseRef.current === id) return;
    handledResponseRef.current = id;

    const target = conversationFromResponse(lastResponse);
    if (target) {
      router.push({
        pathname: '/messages/[conversationId]',
        params: { conversationId: target.conversationId, with: target.withUserId },
      });
    }
  }, [lastResponse, isAuthenticated]);
}
