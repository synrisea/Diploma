import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useMap } from 'react-leaflet';
import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { createPinIcon } from './markerIcon';
import { createClusterIcon } from './clusterIcon';

interface ClusterGroupProps {
  places: PlaceDto[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
}

// react-leaflet has no first-class support for leaflet.markercluster, so this
// bridges the two worlds: create the cluster layer once, then imperatively
// sync its markers whenever `places` (or the selection) changes.
export function ClusterGroup({ places, selectedPlaceId, onSelectPlace }: ClusterGroupProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    });
    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    clusterGroup.clearLayers();

    const markers = places.map((place) => {
      const style = getCategoryStyle(place.categoryName);
      const isSelected = place.id === selectedPlaceId;
      const marker = L.marker([place.latitude, place.longitude], {
        icon: createPinIcon(style.color, isSelected),
      });
      marker.on('click', () => onSelectPlace(place.id));
      return marker;
    });

    clusterGroup.addLayers(markers);
  }, [places, selectedPlaceId, onSelectPlace]);

  return null;
}
