import { useEffect, useMemo, useState } from 'react';
import { Marker, type Region } from 'react-native-maps';
import Supercluster from 'supercluster';
import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { ClusterBubble, PlacePin } from './PlacePin';

interface PointProps {
  placeId: string;
  color: string;
}

const CLUSTER_RADIUS = 50;
const MAX_ZOOM = 20;

export function zoomFromRegion(region: Region): number {
  return Math.round(Math.log2(360 / region.longitudeDelta));
}

export function regionForZoom(latitude: number, longitude: number, zoom: number, aspectRatio: number): Region {
  const longitudeDelta = 360 / Math.pow(2, zoom);
  return { latitude, longitude, latitudeDelta: longitudeDelta * aspectRatio, longitudeDelta };
}

interface PlaceMarkerProps {
  placeId: string;
  color: string;
  coordinate: { latitude: number; longitude: number };
  selected: boolean;
  onSelectPlace: (id: string) => void;
}

function PlaceMarker({ placeId, color, coordinate, selected, onSelectPlace }: PlaceMarkerProps) {
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setCaptured(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 10 : 1}
      tracksViewChanges={selected || !captured}
      onPress={(event) => {
        event.stopPropagation();
        onSelectPlace(placeId);
      }}
    >
      <PlacePin color={color} selected={selected} />
    </Marker>
  );
}

interface PlaceMarkersProps {
  places: PlaceDto[];
  region: Region;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  onExpandCluster: (latitude: number, longitude: number, zoom: number) => void;
}

export function PlaceMarkers({ places, region, selectedPlaceId, onSelectPlace, onExpandCluster }: PlaceMarkersProps) {
  const index = useMemo(() => {
    const supercluster = new Supercluster<PointProps>({ radius: CLUSTER_RADIUS, maxZoom: MAX_ZOOM });
    supercluster.load(
      places.map((place) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [place.longitude, place.latitude] },
        properties: { placeId: place.id, color: getCategoryStyle(place.categoryName).color },
      })),
    );
    return supercluster;
  }, [places]);

  const clusters = useMemo(() => {
    const zoom = Math.min(Math.max(zoomFromRegion(region), 0), MAX_ZOOM);
    const padLng = region.longitudeDelta;
    const padLat = region.latitudeDelta;
    const bbox: [number, number, number, number] = [
      region.longitude - padLng,
      region.latitude - padLat,
      region.longitude + padLng,
      region.latitude + padLat,
    ];
    return index.getClusters(bbox, zoom);
  }, [index, region]);

  return (
    <>
      {clusters.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const coordinate = { latitude, longitude };

        if ('cluster' in feature.properties && feature.properties.cluster) {
          const clusterId = feature.properties.cluster_id;
          const count = feature.properties.point_count;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              coordinate={coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={(event) => {
                event.stopPropagation();
                onExpandCluster(latitude, longitude, Math.min(index.getClusterExpansionZoom(clusterId), MAX_ZOOM));
              }}
            >
              <ClusterBubble count={count} />
            </Marker>
          );
        }

        const { placeId, color } = feature.properties as PointProps;
        return (
          <PlaceMarker
            key={placeId}
            placeId={placeId}
            color={color}
            coordinate={coordinate}
            selected={placeId === selectedPlaceId}
            onSelectPlace={onSelectPlace}
          />
        );
      })}
    </>
  );
}
