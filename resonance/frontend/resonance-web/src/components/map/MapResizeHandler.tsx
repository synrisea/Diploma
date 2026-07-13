import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapResizeHandlerProps {
  resizeTrigger: unknown;
}

// Leaflet caches its container size at init and never notices CSS-driven
// size changes (e.g. the sidebar collapsing) on its own — it needs an
// explicit invalidateSize() call once the transition that resized it finishes.
export function MapResizeHandler({ resizeTrigger }: MapResizeHandlerProps) {
  const map = useMap();

  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 220); // just after the 200ms sidebar width transition
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeTrigger, map]);

  return null;
}
