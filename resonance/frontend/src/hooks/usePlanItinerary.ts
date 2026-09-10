import { useMutation } from '@tanstack/react-query';
import { planItinerary } from '../api/itinerary';

export function usePlanItinerary() {
  return useMutation({ mutationFn: planItinerary });
}
