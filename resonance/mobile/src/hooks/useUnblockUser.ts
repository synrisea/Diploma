import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unblockUser } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useUnblockUser() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUserId: string) => unblockUser(await getValidAccessToken(), blockedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-status'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
