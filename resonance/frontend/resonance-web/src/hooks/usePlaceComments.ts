import { useQuery } from '@tanstack/react-query';
import { getPlaceComments } from '../api/feedback';

export function usePlaceComments(placeId: string) {
  return useQuery({ queryKey: ['place-comments', placeId], queryFn: () => getPlaceComments(placeId) });
}
