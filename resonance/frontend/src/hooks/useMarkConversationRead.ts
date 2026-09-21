import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markConversationRead } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useMarkConversationRead() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => markConversationRead(await getValidAccessToken(), conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
