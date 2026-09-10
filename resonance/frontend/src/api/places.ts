import { apiGet } from './client';
import type { BoundingBox, PlaceDto } from '../types/place';

export function getPlacesInBoundingBox(bbox: BoundingBox): Promise<PlaceDto[]> {
  return apiGet<PlaceDto[]>('/api/places', {
    minLat: bbox.minLat,
    minLng: bbox.minLng,
    maxLat: bbox.maxLat,
    maxLng: bbox.maxLng,
  });
}
