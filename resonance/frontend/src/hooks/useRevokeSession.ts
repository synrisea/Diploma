import { useMutation, useQueryClient } from '@tanstack/react-query';
import { revokeSession } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useRevokeSession() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getValidAccessToken();
      return revokeSession(token, sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
