import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptFriendRequest, declineFriendRequest } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useRespondToFriendRequest() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { requestId: string; accept: boolean }) => {
      const token = await getValidAccessToken();
      return input.accept ? acceptFriendRequest(token, input.requestId) : declineFriendRequest(token, input.requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}
