import type { PlaceDto } from '../../types/place';
import type { PlaceSentiment } from '../../types/sentiment';
import type { Dimension } from '../../types/dimensions';

export type HeatmapMode = { kind: 'overall' } | { kind: 'dimension'; dimensionId: number };

export interface SignedPoint {
  lat: number;
  lng: number;
  weight: number; // 0..1, magnitude only
  sign: -1 | 0 | 1; // -1 negative, 0 neutral/mixed, 1 positive
}

// A single shared max across both signs, so "the most positive place" and
// "the most negative place" stay comparable in magnitude to each other
// instead of each side being independently stretched to fill 0..1.
function normalize(points: SignedPoint[]): SignedPoint[] {
  const max = Math.max(...points.map((p) => p.weight), 0);
  if (max === 0) return [];
  return points.map((p) => ({ ...p, weight: p.weight / max }));
}

export function buildHeatmapPoints(
  mode: HeatmapMode | null,
  places: PlaceDto[],
  sentimentByPlace: PlaceSentiment[],
  dimensions: Dimension[],
): SignedPoint[] {
  if (!mode) return [];

  const placesById = new Map(places.map((place) => [place.id, place]));

  if (mode.kind === 'overall') {
    const raw: SignedPoint[] = [];

    for (const entry of sentimentByPlace) {
      const place = placesById.get(entry.placeId);
      if (!place) continue;
      if (entry.positiveCount > 0) {
        raw.push({ lat: place.latitude, lng: place.longitude, weight: entry.positiveCount, sign: 1 });
      }
      if (entry.negativeCount > 0) {
        raw.push({ lat: place.latitude, lng: place.longitude, weight: entry.negativeCount, sign: -1 });
      }
    }

    return normalize(raw);
  }

  const dimension = dimensions.find((d) => d.id === mode.dimensionId);
  if (!dimension) return [];

  const sign: SignedPoint['sign'] = dimension.sentiment === 'positive' ? 1 : dimension.sentiment === 'negative' ? -1 : 0;

  const raw: SignedPoint[] = Object.entries(dimension.placeCounts)
    .map(([placeId, count]) => {
      const place = placesById.get(placeId);
      return place ? { lat: place.latitude, lng: place.longitude, weight: count, sign } : null;
    })
    .filter((point): point is SignedPoint => point !== null);

  return normalize(raw);
}
