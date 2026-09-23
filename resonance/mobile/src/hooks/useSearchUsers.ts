import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '../api/identity';

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['user-search', query],
    queryFn: () => searchUsers(query),
    enabled: query.trim().length > 0,
  });
}
