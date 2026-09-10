import { useQuery } from '@tanstack/react-query';
import { getPlaceSentiment } from '../api/sentiment';

export function usePlaceSentiment() {
  return useQuery({
    queryKey: ['place-sentiment'],
    queryFn: getPlaceSentiment,
    retry: 1,
  });
}
