import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { exchangeGoogleCode, googleSignInUrl } from '../api/auth';
import type { AuthResponse } from '../types/auth';

export type GoogleSignInResult = { kind: 'success'; auth: AuthResponse } | { kind: 'cancelled' } | { kind: 'error'; message: string };

export function googleRedirectUri(): string {
  return Linking.createURL('auth/callback');
}

export async function completeGoogleSignIn(url: string): Promise<GoogleSignInResult> {
  const { queryParams } = Linking.parse(url);
  const error = typeof queryParams?.error === 'string' ? queryParams.error : null;
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;

  if (error) return { kind: 'error', message: error };
  if (!code) return { kind: 'error', message: 'Google sign-in failed. Please try again.' };

  try {
    return { kind: 'success', auth: await exchangeGoogleCode(code) };
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'Google sign-in failed. Please try again.' };
  }
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectUri = googleRedirectUri();
  const result = await WebBrowser.openAuthSessionAsync(googleSignInUrl(redirectUri), redirectUri, {
    preferEphemeralSession: true,
  });

  if (result.type !== 'success') return { kind: 'cancelled' };
  return completeGoogleSignIn(result.url);
}
