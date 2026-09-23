import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/identity';
import { useAuth } from '../auth/AuthContext';

export function useProfile() {
  const { isAuthenticated, getValidAccessToken } = useAuth();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getValidAccessToken();
      return getMe(token);
    },
    enabled: isAuthenticated,
  });
}
