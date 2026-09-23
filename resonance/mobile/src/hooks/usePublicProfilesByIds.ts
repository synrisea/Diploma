import { useQuery } from '@tanstack/react-query';
import { getPublicProfiles } from '../api/identity';
import type { PublicProfile } from '../types/identity';

export function usePublicProfilesByIds(userIds: string[]) {
  const ids = [...new Set(userIds)].sort();

  return useQuery({
    queryKey: ['public-profiles-batch', ids],
    queryFn: async () => {
      const profiles = await getPublicProfiles(ids);
      return Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, PublicProfile>;
    },
    enabled: ids.length > 0,
  });
}
