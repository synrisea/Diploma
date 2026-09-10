import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitComment } from '../api/feedback';
import { useAuth } from '../auth/AuthContext';

export function useSubmitComment(placeId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comment: string) => {
      if (!token) throw new Error('Not authenticated.');
      return submitComment(token, placeId, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['place-comments', placeId] });
    },
  });
}
