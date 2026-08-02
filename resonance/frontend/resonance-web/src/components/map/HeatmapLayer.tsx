import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export interface WeightedPoint {
  lat: number;
  lng: number;
  weight: number;
}

interface HeatmapLayerProps {
  positivePoints: WeightedPoint[];
  negativePoints: WeightedPoint[];
  neutralPoints: WeightedPoint[];
}

// max: 1 matches the 0..1 normalization done in heatmapPoints.ts.
// maxZoom: 16 matches the map's default zoom (MapView's INITIAL_ZOOM) so
// points render at full intensity there instead of being scaled down by
// leaflet.heat's built-in zoom-distance falloff.
// radius/blur kept tight so blobs read as per-place signal, not a haze
// that swallows the basemap and markers.
const HEAT_OPTIONS = { radius: 22, blur: 16, max: 1, maxZoom: 16 };

// Diverging pair: blue (positive) / brand orange (negative), not red/green —
// red-green is the one diverging pair that collapses under the most common
// forms of color vision deficiency (protanopia/deuteranopia). Blue vs. a warm
// hue reads as opposite poles just as clearly and stays colorblind-safe; using
// the brand orange for "negative" also ties the heatmap to the app's own
// palette instead of generic traffic-light colors. Neutral gray for "mixed".
// Peak alpha is capped below 1 (not fully solid) so the basemap and markers
// stay visible even at the hottest points.
const POSITIVE_GRADIENT = { 0.5: 'rgba(42,120,214,0)', 0.75: 'rgba(42,120,214,0.45)', 1: 'rgba(42,120,214,0.8)' };
const NEGATIVE_GRADIENT = { 0.5: 'rgba(225,85,46,0)', 0.75: 'rgba(225,85,46,0.45)', 1: 'rgba(225,85,46,0.8)' };
const NEUTRAL_GRADIENT = { 0.5: 'rgba(137,135,129,0)', 0.75: 'rgba(137,135,129,0.4)', 1: 'rgba(137,135,129,0.7)' };

export function HeatmapLayer({ positivePoints, negativePoints, neutralPoints }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [];

    const addLayer = (points: WeightedPoint[], gradient: Record<number, string>) => {
      if (points.length === 0) return;
      const heatPoints: [number, number, number][] = points.map((p) => [p.lat, p.lng, p.weight]);
      // leaflet.heat has no official TS types; it extends the global L namespace at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = (L as any).heatLayer(heatPoints, { ...HEAT_OPTIONS, gradient });
      layer.addTo(map);
      layers.push(layer);
    };

    // Rendered as separate single-color layers (not one shared gradient) so a
    // cluster of bad reviews actually glows visibly instead of fading to
    // near-nothing the way a shared density gradient would render it.
    addLayer(negativePoints, NEGATIVE_GRADIENT);
    addLayer(positivePoints, POSITIVE_GRADIENT);
    addLayer(neutralPoints, NEUTRAL_GRADIENT);

    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
    };
  }, [map, positivePoints, negativePoints, neutralPoints]);

  return null;
}
