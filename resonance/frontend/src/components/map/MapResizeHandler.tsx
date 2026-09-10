import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapResizeHandlerProps {
  resizeTrigger: unknown;
}

export function MapResizeHandler({ resizeTrigger }: MapResizeHandlerProps) {
  const map = useMap();

  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 220);
    return () => clearTimeout(timeout);
  }, [resizeTrigger, map]);

  return null;
}
