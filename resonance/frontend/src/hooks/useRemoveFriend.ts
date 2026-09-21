import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeFriend } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useRemoveFriend() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendUserId: string) => removeFriend(await getValidAccessToken(), friendUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}
