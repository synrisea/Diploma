export interface VisitIntent {
  id: string;
  userId: string;
  placeId: string;
  visitDate: string;
  intentTag: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ConversationSummary {
  conversationId: string;
  otherUserId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface ConnectionMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  otherUserId: string;
  isIncoming: boolean;
  createdAt: string;
}
