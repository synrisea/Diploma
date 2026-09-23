import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendFriendRequest } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useSendFriendRequest() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientUserId: string) => {
      const token = await getValidAccessToken();
      return sendFriendRequest(token, recipientUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });
}
