import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { PlaceDto, BoundingBox } from '../../types/place';
import { BoundsWatcher } from './BoundsWatcher';
import { ClusterGroup } from './ClusterGroup';
import { MapResizeHandler } from './MapResizeHandler';

// Torgovy / Ticarət, central Baku
const INITIAL_CENTER: [number, number] = [40.370171, 49.843383];
const INITIAL_ZOOM = 16;

interface MapViewProps {
  places: PlaceDto[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  onBoundsChange: (bbox: BoundingBox) => void;
  resizeTrigger?: unknown;
}

export function MapView({ places, selectedPlaceId, onSelectPlace, onBoundsChange, resizeTrigger }: MapViewProps) {
  return (
    <MapContainer
      center={INITIAL_CENTER}
      zoom={INITIAL_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      <ClusterGroup places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={onSelectPlace} />
      <MapResizeHandler resizeTrigger={resizeTrigger} />
    </MapContainer>
  );
}
