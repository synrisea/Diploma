import type { PlaceDto } from '../../types/place';
import type { PlaceSentiment } from '../../types/sentiment';
import type { Dimension } from '../../types/dimensions';
import type { WeightedPoint } from './HeatmapLayer';

export type HeatmapMode = { kind: 'overall' } | { kind: 'dimension'; dimensionId: number };

export interface HeatmapPoints {
  positive: WeightedPoint[];
  negative: WeightedPoint[];
  neutral: WeightedPoint[];
}

const EMPTY: HeatmapPoints = { positive: [], negative: [], neutral: [] };

// leaflet.heat clips each point's weight against a fixed `max` (we pass 1).
// Comment counts vary a lot between clusters, so without normalizing every
// layer to its own 0..1 range, only the single heaviest point in the whole
// dataset would ever reach full color and everything else would render
// near-invisible.
function normalize(points: WeightedPoint[]): WeightedPoint[] {
  const max = Math.max(...points.map((p) => p.weight), 0);
  if (max === 0) return points;
  return points.map((p) => ({ ...p, weight: p.weight / max }));
}

export function buildHeatmapPoints(
  mode: HeatmapMode | null,
  places: PlaceDto[],
  sentimentByPlace: PlaceSentiment[],
  dimensions: Dimension[],
): HeatmapPoints {
  if (!mode) return EMPTY;

  const placesById = new Map(places.map((place) => [place.id, place]));

  if (mode.kind === 'overall') {
    const positive: WeightedPoint[] = [];
    const negative: WeightedPoint[] = [];

    for (const entry of sentimentByPlace) {
      const place = placesById.get(entry.placeId);
      if (!place) continue;
      if (entry.positiveCount > 0) {
        positive.push({ lat: place.latitude, lng: place.longitude, weight: entry.positiveCount });
      }
      if (entry.negativeCount > 0) {
        negative.push({ lat: place.latitude, lng: place.longitude, weight: entry.negativeCount });
      }
    }

    return { positive: normalize(positive), negative: normalize(negative), neutral: [] };
  }

  const dimension = dimensions.find((d) => d.id === mode.dimensionId);
  if (!dimension) return EMPTY;

  const points: WeightedPoint[] = normalize(
    Object.entries(dimension.placeCounts)
      .map(([placeId, count]) => {
        const place = placesById.get(placeId);
        return place ? { lat: place.latitude, lng: place.longitude, weight: count } : null;
      })
      .filter((point): point is WeightedPoint => point !== null),
  );

  if (dimension.sentiment === 'positive') return { positive: points, negative: [], neutral: [] };
  if (dimension.sentiment === 'negative') return { positive: [], negative: points, neutral: [] };
  return { positive: [], negative: [], neutral: points };
}
