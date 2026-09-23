import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { exchangeGoogleCode } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
import { Text } from '@/components/ui/Text';
import { ErrorBanner, Muted } from '@/components/ui/Feedback';

export default function GoogleCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { setAuth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(params.error ?? null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const code = params.code;
    if (!code) return;

    exchangeGoogleCode(code)
      .then((response) => {
        setAuth(response);
        router.replace('/(tabs)');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'));
  }, [params.code]);

  return (
    <View className="flex-1 items-center justify-center bg-ground px-6">
      {error ? (
        <View className="items-center gap-3">
          <ErrorBanner message={error} />
          <Pressable onPress={() => router.replace('/login')} className="active:opacity-75">
            <Text className="text-sm font-sans-medium text-brand-600">Back to log in</Text>
          </Pressable>
        </View>
      ) : (
        <Muted>Signing you in…</Muted>
      )}
    </View>
  );
}
