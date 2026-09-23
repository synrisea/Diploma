import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useSendMessage(conversationId: string) {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      const token = await getValidAccessToken();
      return sendMessage(token, conversationId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
