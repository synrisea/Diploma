import { useQuery } from '@tanstack/react-query';
import { getMyIntents } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useMyVisitIntents() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['my-visit-intents'],
    queryFn: async () => getMyIntents(await getValidAccessToken()),
    enabled: isAuthenticated,
  });
}
