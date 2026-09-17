import { useMutation } from '@tanstack/react-query';
import { startEmailChange } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useStartEmailChange() {
  const { getValidAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (newEmail: string) => {
      const token = await getValidAccessToken();
      return startEmailChange(token, newEmail);
    },
  });
}
