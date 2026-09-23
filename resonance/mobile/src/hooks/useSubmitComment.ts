import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitComment } from '../api/feedback';
import { useAuth } from '../auth/AuthContext';

export function useSubmitComment(placeId: string) {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: string) => {
      const token = await getValidAccessToken();
      return submitComment(token, placeId, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place-comments', placeId] });
    },
  });
}
