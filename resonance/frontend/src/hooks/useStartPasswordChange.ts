import { useMutation } from '@tanstack/react-query';
import { startPasswordChange } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useStartPasswordChange() {
  const { getValidAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (input: { currentPassword: string | null; newPassword: string }) => {
      const token = await getValidAccessToken();
      return startPasswordChange(token, input.currentPassword, input.newPassword);
    },
  });
}
