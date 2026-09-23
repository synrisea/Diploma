import { Circle, Heatmap } from 'react-native-maps';
import type { SignedPoint } from './heatmapPoints';
import { colors } from '../../theme/tokens';

const RADIUS = 26;
const PEAK_ALPHA = 0.75;

const NEUTRAL = '#9c917f';

function gradientFor(pole: string) {
  return {
    colors: [`${NEUTRAL}00`, NEUTRAL, pole],
    startPoints: [0.05, 0.35, 1],
    colorMapSize: 256,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function colorForSign(sign: SignedPoint['sign']): string {
  if (sign > 0) return colors.sentiment.positive;
  if (sign < 0) return colors.sentiment.negative;
  return colors.sentiment.mixed;
}

function toWeighted(points: SignedPoint[]) {
  return points.map((point) => ({ latitude: point.lat, longitude: point.lng, weight: point.weight }));
}

export function HeatmapOverlay({ points, supportsHeatmap }: { points: SignedPoint[]; supportsHeatmap: boolean }) {
  if (points.length === 0) return null;

  if (!supportsHeatmap) {
    return (
      <>
        {points.map((point, i) => (
          <Circle
            key={`${point.lat}-${point.lng}-${point.sign}-${i}`}
            center={{ latitude: point.lat, longitude: point.lng }}
            radius={40 + 90 * point.weight}
            strokeWidth={0}
            fillColor={hexToRgba(colorForSign(point.sign), 0.12 + 0.4 * Math.sqrt(point.weight))}
            zIndex={1}
          />
        ))}
      </>
    );
  }

  const positive = points.filter((p) => p.sign > 0);
  const negative = points.filter((p) => p.sign < 0);
  const mixed = points.filter((p) => p.sign === 0);

  return (
    <>
      {negative.length > 0 && (
        <Heatmap
          points={toWeighted(negative)}
          radius={RADIUS}
          opacity={PEAK_ALPHA}
          gradient={gradientFor(colors.sentiment.negative)}
        />
      )}
      {positive.length > 0 && (
        <Heatmap
          points={toWeighted(positive)}
          radius={RADIUS}
          opacity={PEAK_ALPHA}
          gradient={gradientFor(colors.sentiment.positive)}
        />
      )}
      {mixed.length > 0 && (
        <Heatmap
          points={toWeighted(mixed)}
          radius={RADIUS}
          opacity={PEAK_ALPHA}
          gradient={gradientFor(colors.sentiment.mixed)}
        />
      )}
    </>
  );
}
