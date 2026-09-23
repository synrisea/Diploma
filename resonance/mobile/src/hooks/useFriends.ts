import { useQuery } from '@tanstack/react-query';
import { getFriends } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useFriends() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getFriends(token);
    },
    enabled: isAuthenticated,
  });
}
