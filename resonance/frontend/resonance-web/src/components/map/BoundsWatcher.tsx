import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { BoundingBox } from '../../types/place';

interface BoundsWatcherProps {
  onBoundsChange: (bbox: BoundingBox) => void;
}

function toBoundingBox(map: LeafletMap): BoundingBox {
  const bounds = map.getBounds();
  return {
    minLat: bounds.getSouth(),
    minLng: bounds.getWest(),
    maxLat: bounds.getNorth(),
    maxLng: bounds.getEast(),
  };
}

export function BoundsWatcher({ onBoundsChange }: BoundsWatcherProps) {
  const map = useMap();

  useEffect(() => {
    onBoundsChange(toBoundingBox(map));
    // Only run once, when the map first mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMapEvents({
    moveend: (event) => onBoundsChange(toBoundingBox(event.target)),
    // Leaflet caches bounds against its container's last known size, so a
    // map that mounts while hidden (e.g. behind the mobile List/Map toggle)
    // reports degenerate zero-size bounds until something recomputes them.
    // invalidateSize() emits `resize` once the container's real size is
    // known - listen for it too, not just user-driven pan/zoom.
    resize: (event) => onBoundsChange(toBoundingBox(event.target)),
  });

  return null;
}
