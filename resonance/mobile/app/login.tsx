import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login, register } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
import { signInWithGoogle } from '@/auth/googleSignIn';
import { SignalBackdrop } from '@/components/layout/SignalBackdrop';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ErrorBanner } from '@/components/ui/Feedback';
import { GoogleIcon, Logo } from '@/components/ui/icons';
import { shadows } from '@/theme/tokens';

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-sans-medium text-stone-700">{label}</Text>
      {children}
      {hint && <Text className="font-mono text-[11px] text-stone-500">{hint}</Text>}
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= 8 && (mode === 'login' || displayName.trim().length > 0);

  const finish = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)');
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response =
        mode === 'login' ? await login(email.trim(), password) : await register(email.trim(), password, displayName.trim());
      setAuth(response);
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (isGoogleBusy) return;
    setError(null);
    setIsGoogleBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.kind === 'success') {
        setAuth(result.auth);
        finish();
      } else if (result.kind === 'error') {
        setError(result.message);
      }
    } finally {
      setIsGoogleBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-ground">
      <SignalBackdrop />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6"
          contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-brand-500" style={shadows.brandGlow} />
              <Text className="font-mono text-[11px] uppercase tracking-[3px] text-brand-500">Baku - community preview</Text>
            </View>
            <Text className="font-display text-3xl leading-[38px] text-stone-900">
              Don’t trust the star rating. See what it’s actually like.
            </Text>
          </View>

          <View
            className="rounded-[32px] border border-stone-900/10 bg-stone-900/[0.03] p-1.5"
            style={shadows.panel}
          >
            <View className="rounded-[26px] bg-ground-2/90 px-7 py-8">
              <View className="mb-6 flex-row items-center gap-2">
                <Logo size={24} />
                <Text className="font-display text-base uppercase tracking-[0.5px] text-stone-900">Resonance</Text>
              </View>

              <Text className="font-display text-2xl text-stone-900">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text className="mt-1.5 text-sm text-stone-500">
                {mode === 'login' ? 'Log in to leave a signal on a place.' : 'Join the community leaving signals on places.'}
              </Text>

              <View className="mt-6 gap-3.5">
                {mode === 'register' && (
                  <Field label="Name">
                    <Input value={displayName} onChangeText={setDisplayName} autoCapitalize="words" textContentType="name" />
                  </Field>
                )}

                <Field label="Email">
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </Field>

                <Field label="Password" hint="Minimum 8 characters">
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    textContentType={mode === 'login' ? 'password' : 'newPassword'}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="go"
                  />
                </Field>

                <View className="min-h-[42px]">{error && <ErrorBanner message={error} />}</View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting || !canSubmit}
                  className={`mt-1 flex-row items-center justify-center gap-2 rounded-full bg-brand-500 p-1.5 active:bg-brand-600 ${
                    isSubmitting || !canSubmit ? 'opacity-50' : ''
                  }`}
                >
                  <Text className="text-sm font-sans-medium text-brand-ink">
                    {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-black/15">
                    <Text className="text-xs text-brand-ink">↗</Text>
                  </View>
                </Pressable>
              </View>

              <View className="mt-4 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-stone-900/10" />
                <Text className="font-mono text-[11px] uppercase tracking-[1px] text-stone-500">or</Text>
                <View className="h-px flex-1 bg-stone-900/10" />
              </View>

              <Pressable
                onPress={handleGoogle}
                disabled={isGoogleBusy}
                className={`mt-4 flex-row items-center justify-center gap-2 rounded-full border border-stone-900/10 bg-stone-900/[0.03] py-2.5 active:bg-stone-900/[0.06] ${
                  isGoogleBusy ? 'opacity-50' : ''
                }`}
              >
                <GoogleIcon />
                <Text className="text-sm font-sans-medium text-stone-700">
                  {isGoogleBusy ? 'Opening Google…' : 'Continue with Google'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="mt-5 active:opacity-75"
              >
                <Text className="text-sm text-stone-500">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <Text className="text-sm font-sans-medium text-brand-600">{mode === 'login' ? 'Register' : 'Log in'}</Text>
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={finish} className="mt-6 items-center active:opacity-75">
            <Text className="font-mono text-[11px] uppercase tracking-[1px] text-stone-500">Just browse the map</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
