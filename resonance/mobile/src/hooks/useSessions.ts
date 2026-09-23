import { useQuery } from '@tanstack/react-query';
import { getSessions } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useSessions() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getSessions(token);
    },
    enabled: isAuthenticated,
  });
}
