import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useUpdateProfile() {
  const { getValidAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      displayName?: string;
      preferencesJson?: string;
      bio?: string;
      interests?: string[];
      preferredLanguage?: string;
    }) => {
      const token = await getValidAccessToken();
      return updateProfile(token, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
