import { Marker } from 'react-leaflet';
import type { PlaceDto } from '../../types/place';
import { createRouteStopIcon } from './routeStopIcon';

interface RouteStopMarkersProps {
  stops: PlaceDto[];
}

export function RouteStopMarkers({ stops }: RouteStopMarkersProps) {
  return (
    <>
      {stops.map((stop, i) => (
        <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={createRouteStopIcon(i, stops.length)} />
      ))}
    </>
  );
}
