import { useQuery } from '@tanstack/react-query';
import { getUserComments } from '../api/feedback';

export function useUserComments(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-comments', userId],
    queryFn: () => getUserComments(userId!),
    enabled: !!userId,
  });
}
