import { useQuery } from '@tanstack/react-query';
import { getPublicProfile } from '../api/identity';

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => getPublicProfile(userId!),
    enabled: !!userId,
  });
}
