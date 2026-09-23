import { useEffect, useState } from 'react';
import { Polyline } from 'react-native-maps';
import type { PlaceDto } from '../../types/place';
import { colors } from '../../theme/tokens';

const LEG_DRAW_MS = 600;
const LEG_STAGGER_MS = 350;
const GLOW_COLOR = 'rgba(255, 106, 57, 0.35)';

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useRouteDrawProgress(legCount: number, routeKey: string): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (legCount === 0) return;
    const total = LEG_STAGGER_MS * (legCount - 1) + LEG_DRAW_MS;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const now = Date.now() - start;
      setElapsed(Math.min(now, total));
      if (now < total) frame = requestAnimationFrame(tick);
    };
    setElapsed(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [legCount, routeKey]);

  return elapsed;
}

export function RoutePolyline({ stops }: { stops: PlaceDto[] }) {
  const legs = stops.slice(1).map((to, i) => ({ from: stops[i], to }));
  const routeKey = stops.map((s) => s.id).join('>');
  const elapsed = useRouteDrawProgress(legs.length, routeKey);

  return (
    <>
      {legs.map(({ from, to }, i) => {
        const legProgress = easeOut(Math.min(Math.max((elapsed - i * LEG_STAGGER_MS) / LEG_DRAW_MS, 0), 1));
        if (legProgress <= 0) return null;

        const end = {
          latitude: from.latitude + (to.latitude - from.latitude) * legProgress,
          longitude: from.longitude + (to.longitude - from.longitude) * legProgress,
        };
        const coordinates = [{ latitude: from.latitude, longitude: from.longitude }, end];

        return (
          <Polyline key={`${from.id}-${to.id}`} coordinates={coordinates} strokeColor={colors.brand[500]} strokeWidth={3} zIndex={3} />
        );
      })}
      {legs.map(({ from, to }, i) => {
        const legProgress = easeOut(Math.min(Math.max((elapsed - i * LEG_STAGGER_MS) / LEG_DRAW_MS, 0), 1));
        if (legProgress <= 0) return null;

        const end = {
          latitude: from.latitude + (to.latitude - from.latitude) * legProgress,
          longitude: from.longitude + (to.longitude - from.longitude) * legProgress,
        };

        return (
          <Polyline
            key={`glow-${from.id}-${to.id}`}
            coordinates={[{ latitude: from.latitude, longitude: from.longitude }, end]}
            strokeColor={GLOW_COLOR}
            strokeWidth={9}
            zIndex={2}
          />
        );
      })}
    </>
  );
}
