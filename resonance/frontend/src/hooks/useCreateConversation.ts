import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createConversation } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useCreateConversation() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { recipientUserId: string; initialMessage: string; visitIntentId?: string }) => {
      const token = await getValidAccessToken();
      return createConversation(token, input.recipientUserId, input.initialMessage, input.visitIntentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
