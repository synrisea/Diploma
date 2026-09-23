import { useQuery } from '@tanstack/react-query';
import { getFriendRequests } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useFriendRequests() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['friend-requests'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getFriendRequests(token);
    },
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });
}
