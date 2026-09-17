import { useQuery } from '@tanstack/react-query';
import { getPublicProfiles } from '../api/identity';
import type { PlaceComment } from '../types/feedback';
import type { PublicProfile } from '../types/identity';

export function useCommentAuthors(comments: PlaceComment[] | undefined) {
  const userIds = [...new Set((comments ?? []).map((c) => c.userId))].sort();

  return useQuery({
    queryKey: ['comment-authors', userIds],
    queryFn: async () => {
      const profiles = await getPublicProfiles(userIds);
      return Object.fromEntries(profiles.map((p) => [p.id, p])) as Record<string, PublicProfile>;
    },
    enabled: userIds.length > 0,
  });
}
