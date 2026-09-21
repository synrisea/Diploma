import type { ConnectionMessage, ConversationSummary, FriendRequest, VisitIntent } from '../types/connections';

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

export async function getMyIntents(accessToken: string): Promise<VisitIntent[]> {
  const response = await authedFetch('/api/connections/intents/mine', accessToken);
  return (await response.json()) as VisitIntent[];
}

export async function createIntent(
  accessToken: string,
  placeId: string,
  visitDate: string,
  intentTag?: string,
): Promise<{ id: string }> {
  const response = await authedFetch('/api/connections/intents', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId, visitDate, intentTag: intentTag || null }),
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

export async function markConversationRead(accessToken: string, conversationId: string): Promise<void> {
  await authedFetch(`/api/connections/conversations/${conversationId}/read`, accessToken, { method: 'POST' });
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

export async function sendFriendRequest(accessToken: string, recipientUserId: string): Promise<{ requestId: string }> {
  const response = await authedFetch('/api/connections/friend-requests', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientUserId }),
  });
  return (await response.json()) as { requestId: string };
}

export async function getFriendRequests(accessToken: string): Promise<FriendRequest[]> {
  const response = await authedFetch('/api/connections/friend-requests', accessToken);
  return (await response.json()) as FriendRequest[];
}

export async function acceptFriendRequest(accessToken: string, requestId: string): Promise<void> {
  await authedFetch(`/api/connections/friend-requests/${requestId}/accept`, accessToken, { method: 'POST' });
}

export async function declineFriendRequest(accessToken: string, requestId: string): Promise<void> {
  await authedFetch(`/api/connections/friend-requests/${requestId}/decline`, accessToken, { method: 'POST' });
}

export async function removeFriend(accessToken: string, friendUserId: string): Promise<void> {
  await authedFetch(`/api/connections/friends/${friendUserId}`, accessToken, { method: 'DELETE' });
}

export async function getFriends(accessToken: string): Promise<string[]> {
  const response = await authedFetch('/api/connections/friends', accessToken);
  return (await response.json()) as string[];
}
