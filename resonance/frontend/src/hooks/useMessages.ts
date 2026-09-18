import { useQuery } from '@tanstack/react-query';
import { getMessages } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useMessages(conversationId: string | undefined) {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getMessages(token, conversationId!);
    },
    enabled: isAuthenticated && !!conversationId,
    refetchInterval: 4000,
  });
}
