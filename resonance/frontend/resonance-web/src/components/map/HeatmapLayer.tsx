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
const HEAT_OPTIONS = { radius: 32, blur: 22, max: 1, maxZoom: 16 };

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

    // Rendered as separate single-color layers (not one red-to-green gradient)
    // so a cluster of bad reviews actually glows red instead of fading to
    // near-nothing the way a shared density gradient would render it.
    addLayer(negativePoints, { 0.4: 'rgba(220,38,38,0)', 0.65: 'rgba(220,38,38,0.55)', 1: '#dc2626' });
    addLayer(positivePoints, { 0.4: 'rgba(22,163,74,0)', 0.65: 'rgba(22,163,74,0.55)', 1: '#16a34a' });
    addLayer(neutralPoints, { 0.4: 'rgba(217,119,6,0)', 0.65: 'rgba(217,119,6,0.5)', 1: '#d97706' });

    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
    };
  }, [map, positivePoints, negativePoints, neutralPoints]);

  return null;
}
