import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAvatar, type UploadFile } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useUploadAvatar() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: UploadFile) => {
      const token = await getValidAccessToken();
      return uploadAvatar(token, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
