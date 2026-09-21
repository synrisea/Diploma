import { useConversations } from './useConversations';

export function useUnreadCount(): number {
  const { data: conversations = [] } = useConversations();
  return conversations.reduce((total, c) => total + (c.unreadCount ?? 0), 0);
}
