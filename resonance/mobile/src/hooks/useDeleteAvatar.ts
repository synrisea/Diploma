import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAvatar } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useDeleteAvatar() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getValidAccessToken();
      return deleteAvatar(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
