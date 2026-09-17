import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAvatar } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useUploadAvatar() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getValidAccessToken();
      return uploadAvatar(token, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
