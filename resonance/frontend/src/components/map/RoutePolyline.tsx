import { Polyline } from 'react-leaflet';
import type { Polyline as LeafletPolyline } from 'leaflet';
import type { PlaceDto } from '../../types/place';

interface RoutePolylineProps {
  stops: PlaceDto[];
}

const LEG_STAGGER_SECONDS = 0.35;

export function RoutePolyline({ stops }: RoutePolylineProps) {
  return (
    <>
      {stops.slice(1).map((to, i) => {
        const from = stops[i];
        return (
          <Polyline
            key={`${from.id}-${to.id}`}
            positions={[
              [from.latitude, from.longitude],
              [to.latitude, to.longitude],
            ]}
            pathOptions={{ className: 'route-leg', color: 'var(--color-brand-500)', weight: 3 }}
            eventHandlers={{
              add: (event) => {
                const layer = event.target as LeafletPolyline;
                const element = layer.getElement?.() as SVGElement | undefined;
                element?.style.setProperty('--leg-delay', `${i * LEG_STAGGER_SECONDS}s`);
              },
            }}
          />
        );
      })}
    </>
  );
}
