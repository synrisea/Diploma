import type { PublicProfile, PublicProfileDetail, Session, UserProfile, UserSearchResult } from '../types/identity';

const IDENTITY_API_BASE_URL = import.meta.env.VITE_IDENTITY_API_BASE_URL ?? 'http://localhost:5076';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function authedFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${IDENTITY_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {}
    throw new ApiError(response.status, message);
  }

  return response;
}

export async function getMe(accessToken: string): Promise<UserProfile> {
  const response = await authedFetch('/api/identity/me', accessToken);
  return (await response.json()) as UserProfile;
}

export async function updateProfile(
  accessToken: string,
  updates: {
    displayName?: string;
    preferencesJson?: string;
    bio?: string;
    interests?: string[];
    preferredLanguage?: string;
  },
): Promise<void> {
  await authedFetch('/api/identity/me', accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function uploadAvatar(accessToken: string, file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authedFetch('/api/identity/me/avatar', accessToken, { method: 'PUT', body: formData });
  return (await response.json()) as { avatarUrl: string };
}

export async function deleteAvatar(accessToken: string): Promise<void> {
  await authedFetch('/api/identity/me/avatar', accessToken, { method: 'DELETE' });
}

export async function startEmailChange(accessToken: string, newEmail: string): Promise<void> {
  await authedFetch('/api/identity/me/email', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newEmail }),
  });
}

export async function startPasswordChange(
  accessToken: string,
  currentPassword: string | null,
  newPassword: string,
): Promise<void> {
  await authedFetch('/api/identity/me/password', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getSessions(accessToken: string): Promise<Session[]> {
  const response = await authedFetch('/api/identity/sessions', accessToken);
  return (await response.json()) as Session[];
}

export async function revokeSession(accessToken: string, sessionId: string): Promise<void> {
  await authedFetch(`/api/identity/sessions/${sessionId}`, accessToken, { method: 'DELETE' });
}

export async function revokeOtherSessions(accessToken: string): Promise<void> {
  await authedFetch('/api/identity/sessions', accessToken, { method: 'DELETE' });
}

export async function getPublicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams();
  ids.forEach((id) => params.append('ids', id));
  const response = await fetch(`${IDENTITY_API_BASE_URL}/api/identity/public-profiles?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to load comment authors.');
  return (await response.json()) as PublicProfile[];
}

export async function getPublicProfile(id: string): Promise<PublicProfileDetail | null> {
  const response = await fetch(`${IDENTITY_API_BASE_URL}/api/identity/users/${id}/public-profile`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to load profile.');
  return (await response.json()) as PublicProfileDetail;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (query.trim().length === 0) return [];
  const response = await fetch(`${IDENTITY_API_BASE_URL}/api/identity/users/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search users.');
  return (await response.json()) as UserSearchResult[];
}
