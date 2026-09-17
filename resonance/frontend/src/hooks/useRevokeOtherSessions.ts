import { useMutation, useQueryClient } from '@tanstack/react-query';
import { revokeOtherSessions } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useRevokeOtherSessions() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getValidAccessToken();
      return revokeOtherSessions(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
