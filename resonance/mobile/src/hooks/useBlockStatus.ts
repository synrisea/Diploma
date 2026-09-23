import { useQuery } from '@tanstack/react-query';
import { getBlockStatus } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useBlockStatus(userId: string | undefined) {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['block-status', userId],
    queryFn: async () => getBlockStatus(await getValidAccessToken(), userId!),
    enabled: isAuthenticated && !!userId,
  });
}
