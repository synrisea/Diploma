import { useQuery } from '@tanstack/react-query';
import { getPlaceSummary } from '../api/topics';

export function usePlaceSummary(placeId: string, placeName: string) {
  return useQuery({
    queryKey: ['place-summary', placeId],
    queryFn: () => getPlaceSummary(placeId, placeName),
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });
}
