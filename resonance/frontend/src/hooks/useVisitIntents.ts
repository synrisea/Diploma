import { useQuery } from '@tanstack/react-query';
import { getIntentsForPlace } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useVisitIntents(placeId: string) {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['visit-intents', placeId],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getIntentsForPlace(token, placeId);
    },
    enabled: isAuthenticated,
  });
}
