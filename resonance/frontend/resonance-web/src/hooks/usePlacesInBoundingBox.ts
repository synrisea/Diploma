import { useQuery } from '@tanstack/react-query';
import { getPlacesInBoundingBox } from '../api/places';
import type { BoundingBox } from '../types/place';

// Round to ~11m precision so tiny sub-pixel pans reuse the same cached query
// instead of firing a new request on every map frame.
function roundBbox(bbox: BoundingBox): BoundingBox {
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return {
    minLat: round(bbox.minLat),
    minLng: round(bbox.minLng),
    maxLat: round(bbox.maxLat),
    maxLng: round(bbox.maxLng),
  };
}

export function usePlacesInBoundingBox(bbox: BoundingBox | null) {
  const rounded = bbox ? roundBbox(bbox) : null;

  return useQuery({
    queryKey: ['places', rounded],
    queryFn: () => getPlacesInBoundingBox(rounded!),
    enabled: rounded !== null,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
}
