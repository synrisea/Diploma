import { useQuery } from '@tanstack/react-query';
import { getTopicsForPlace } from '../api/topics';

export function usePlaceTopics(placeId: string) {
  return useQuery({
    queryKey: ['place-topics', placeId],
    queryFn: () => getTopicsForPlace(placeId),
    retry: 1,
  });
}
