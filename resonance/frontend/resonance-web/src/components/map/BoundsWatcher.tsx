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
  });

  return null;
}
