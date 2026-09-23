import { config } from '../config';
import type { AuthResponse } from '../types/auth';

const IDENTITY_API_BASE_URL = config.identityApiBaseUrl;

async function postAuth(path: string, body: unknown): Promise<AuthResponse> {
  const response = await fetch(`${IDENTITY_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 409) throw new Error('An account with this email already exists.');
    if (response.status === 401) throw new Error('Invalid email or password.');
    throw new Error('Something went wrong. Please try again.');
  }

  return (await response.json()) as AuthResponse;
}

export function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  return postAuth('/api/auth/register', { email, password, displayName });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return postAuth('/api/auth/login', { email, password });
}

export async function refreshAuth(refreshToken: string): Promise<AuthResponse> {
  const response = await fetch(`${IDENTITY_API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Session expired. Please log in again.');
  }

  return (await response.json()) as AuthResponse;
}

export function googleSignInUrl(returnTo: string): string {
  return `${IDENTITY_API_BASE_URL}/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function exchangeGoogleCode(code: string): Promise<AuthResponse> {
  const response = await fetch(`${IDENTITY_API_BASE_URL}/api/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error('Google sign-in failed. Please try again.');
  return (await response.json()) as AuthResponse;
}
