import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteIntent } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useDeleteVisitIntent(placeId?: string) {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intentId: string) => {
      const token = await getValidAccessToken();
      return deleteIntent(token, intentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-intents', placeId] });
      queryClient.invalidateQueries({ queryKey: ['my-visit-intents'] });
    },
  });
}
