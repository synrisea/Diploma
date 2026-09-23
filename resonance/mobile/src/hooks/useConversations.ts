import { useQuery } from '@tanstack/react-query';
import { getConversations } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useConversations() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getConversations(token);
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });
}
