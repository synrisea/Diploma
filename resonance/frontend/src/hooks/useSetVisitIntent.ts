import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIntent } from '../api/connections';
import { useAuth } from '../auth/AuthContext';

export function useSetVisitIntent(placeId: string) {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { timeBucket: string; intentTag?: string }) => {
      const token = await getValidAccessToken();
      return createIntent(token, placeId, input.timeBucket, input.intentTag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-intents', placeId] });
    },
  });
}
