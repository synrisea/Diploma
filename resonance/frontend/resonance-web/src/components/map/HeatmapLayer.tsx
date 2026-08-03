import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SignedPoint } from './heatmapPoints';

interface HeatmapLayerProps {
  points: SignedPoint[];
}

// Each point spreads its signed weight into nearby pixels with a Gaussian
// falloff (smooth by construction, no hard edge at the cutoff) and every
// point's contribution is summed into ONE signed grid — unlike two
// independently alpha-blended canvases, a place with both positive and
// negative comments nets out to its true combined value here instead of
// whichever layer happened to be more opaque at that pixel.
const RADIUS = 26;
const SIGMA = RADIUS / 3;
const PEAK_ALPHA = 0.75;
// Normalizing by the single strongest pixel lets one outlier location crush
// the visible contrast for the whole map (with ~400 places, that's common).
// Normalize against the 90th percentile of nonzero magnitude instead, and
// clamp anything above it to full saturation.
const NORMALIZE_PERCENTILE = 0.9;

// Diverging pair: brand orange (negative) <-> neutral gray <-> blue
// (positive), matching the app's palette instead of a generic red/green.
const NEGATIVE_RGB: [number, number, number] = [225, 85, 46]; // #e1552e
const NEUTRAL_RGB: [number, number, number] = [137, 135, 129]; // #898781
const POSITIVE_RGB: [number, number, number] = [42, 120, 214]; // #2a78d6

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// v in [-1, 1]: interpolates neutral -> positive for v >= 0, neutral -> negative for v < 0.
function colorForValue(v: number): [number, number, number] {
  const pole = v >= 0 ? POSITIVE_RGB : NEGATIVE_RGB;
  const t = Math.min(Math.abs(v), 1);
  return [lerp(NEUTRAL_RGB[0], pole[0], t), lerp(NEUTRAL_RGB[1], pole[1], t), lerp(NEUTRAL_RGB[2], pole[2], t)];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-zoom-hide') as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    map.getPanes().overlayPane.appendChild(canvas);

    const redraw = () => {
      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
      canvas.width = size.x;
      canvas.height = size.y;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (points.length === 0) {
        ctx.clearRect(0, 0, size.x, size.y);
        return;
      }

      const grid = new Float32Array(size.x * size.y);

      for (const point of points) {
        const center = map.latLngToContainerPoint([point.lat, point.lng]);
        const cx = Math.round(center.x);
        const cy = Math.round(center.y);
        const minX = Math.max(0, cx - RADIUS);
        const maxX = Math.min(size.x - 1, cx + RADIUS);
        const minY = Math.max(0, cy - RADIUS);
        const maxY = Math.min(size.y - 1, cy + RADIUS);

        for (let y = minY; y <= maxY; y++) {
          const rowOffset = y * size.x;
          for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq > RADIUS * RADIUS) continue;
            const falloff = Math.exp(-distSq / (2 * SIGMA * SIGMA));
            grid[rowOffset + x] += point.sign * point.weight * falloff;
          }
        }
      }

      const magnitudes: number[] = [];
      for (let i = 0; i < grid.length; i++) {
        const abs = Math.abs(grid[i]);
        if (abs > 0) magnitudes.push(abs);
      }
      if (magnitudes.length === 0) {
        ctx.clearRect(0, 0, size.x, size.y);
        return;
      }
      magnitudes.sort((a, b) => a - b);
      const normCeiling = magnitudes[Math.floor(NORMALIZE_PERCENTILE * (magnitudes.length - 1))] || magnitudes[magnitudes.length - 1];

      const image = ctx.createImageData(size.x, size.y);
      const data = image.data;
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] === 0) continue;
        const v = grid[i] / normCeiling;
        // Most places have a mix of positive and negative comments, so their
        // net signed value sits close to zero even with plenty of underlying
        // activity. A linear alpha would render that as near-invisible; a
        // sqrt stretch keeps weak-but-real signal visible without changing
        // which places read as strongly one-sided (v = ±1 is unaffected).
        const alpha = Math.sqrt(Math.min(Math.abs(v), 1)) * PEAK_ALPHA;
        if (alpha < 0.02) continue;
        const [r, g, b] = colorForValue(v);
        const idx = i * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.round(alpha * 255);
      }
      ctx.putImageData(image, 0, 0);
    };

    const handleZoomAnim = (e: L.ZoomAnimEvent) => {
      const scale = map.getZoomScale(e.zoom, map.getZoom());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const offset = (map as any)._latLngToNewLayerPoint(map.getBounds().getNorthWest(), e.zoom, e.center);
      L.DomUtil.setTransform(canvas, offset, scale);
    };

    redraw();
    map.on('moveend', redraw);
    if (map.options.zoomAnimation) {
      map.on('zoomanim', handleZoomAnim);
    }

    return () => {
      map.off('moveend', redraw);
      map.off('zoomanim', handleZoomAnim);
      map.getPanes().overlayPane.removeChild(canvas);
    };
  }, [map, points]);

  return null;
}
