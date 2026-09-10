import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { PlaceDto } from '../../types/place';
import { ClusterGroup } from './ClusterGroup';
import { MapResizeHandler } from './MapResizeHandler';
import { HeatmapLayer } from './HeatmapLayer';
import { RoutePolyline } from './RoutePolyline';
import { RouteStopMarkers } from './RouteStopMarkers';
import type { SignedPoint } from './heatmapPoints';

const INITIAL_CENTER: [number, number] = [40.370171, 49.843383];
const INITIAL_ZOOM = 16;

interface MapViewProps {
  places: PlaceDto[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  resizeTrigger?: unknown;
  heatmapPoints?: SignedPoint[] | null;
  routeStops?: PlaceDto[] | null;
}

export function MapView({
  places,
  selectedPlaceId,
  onSelectPlace,
  resizeTrigger,
  heatmapPoints,
  routeStops,
}: MapViewProps) {
  return (
    <MapContainer
      center={INITIAL_CENTER}
      zoom={INITIAL_ZOOM}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_30wr_1_32c5b924dff3fbaac5108708"
        subdomains="abcd"
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />
      {heatmapPoints && <HeatmapLayer points={heatmapPoints} />}
      <ClusterGroup places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={onSelectPlace} />
      {routeStops && <RoutePolyline stops={routeStops} />}
      {routeStops && <RouteStopMarkers stops={routeStops} />}
      <MapResizeHandler resizeTrigger={resizeTrigger} />
    </MapContainer>
  );
}
