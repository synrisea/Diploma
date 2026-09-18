import type { ConnectionMessage, ConversationSummary, VisitIntent } from '../types/connections';

const CONNECTIONS_API_BASE_URL = import.meta.env.VITE_CONNECTIONS_API_BASE_URL ?? 'http://localhost:5122';

async function authedFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${CONNECTIONS_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {}
    throw new Error(message);
  }

  return response;
}

export async function getIntentsForPlace(accessToken: string, placeId: string): Promise<VisitIntent[]> {
  const response = await authedFetch(`/api/connections/intents?placeId=${placeId}`, accessToken);
  return (await response.json()) as VisitIntent[];
}

export async function createIntent(
  accessToken: string,
  placeId: string,
  timeBucket: string,
  intentTag?: string,
): Promise<{ id: string }> {
  const response = await authedFetch('/api/connections/intents', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId, timeBucket, intentTag: intentTag || null }),
  });
  return (await response.json()) as { id: string };
}

export async function deleteIntent(accessToken: string, intentId: string): Promise<void> {
  await authedFetch(`/api/connections/intents/${intentId}`, accessToken, { method: 'DELETE' });
}

export async function createConversation(
  accessToken: string,
  recipientUserId: string,
  initialMessage: string,
  visitIntentId?: string,
): Promise<{ conversationId: string }> {
  const response = await authedFetch('/api/connections/conversations', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientUserId, initialMessage, visitIntentId: visitIntentId ?? null }),
  });
  return (await response.json()) as { conversationId: string };
}

export async function getConversations(accessToken: string): Promise<ConversationSummary[]> {
  const response = await authedFetch('/api/connections/conversations', accessToken);
  return (await response.json()) as ConversationSummary[];
}

export async function getMessages(accessToken: string, conversationId: string): Promise<ConnectionMessage[]> {
  const response = await authedFetch(`/api/connections/conversations/${conversationId}/messages`, accessToken);
  return (await response.json()) as ConnectionMessage[];
}

export async function sendMessage(accessToken: string, conversationId: string, body: string): Promise<ConnectionMessage> {
  const response = await authedFetch(`/api/connections/conversations/${conversationId}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  return (await response.json()) as ConnectionMessage;
}

export async function blockUser(accessToken: string, blockedUserId: string): Promise<void> {
  await authedFetch('/api/connections/blocks', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockedUserId }),
  });
}

export async function unblockUser(accessToken: string, blockedUserId: string): Promise<void> {
  await authedFetch(`/api/connections/blocks/${blockedUserId}`, accessToken, { method: 'DELETE' });
}
