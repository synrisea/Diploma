import { useMutation, useQueryClient } from '@tanstack/react-query';
import { blockUser } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useBlockUser() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockedUserId: string) => {
      const token = await getValidAccessToken();
      return blockUser(token, blockedUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
