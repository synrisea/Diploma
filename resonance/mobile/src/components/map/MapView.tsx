import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import RNMapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { PlaceDto } from '../../types/place';
import type { SignedPoint } from './heatmapPoints';
import { darkMapStyle } from './mapStyle';
import { PlaceMarkers, regionForZoom } from './PlaceMarkers';
import { HeatmapOverlay } from './HeatmapOverlay';
import { RoutePolyline } from './RoutePolyline';
import { RouteStopMarkers } from './RouteStopMarkers';
import { config } from '../../config';
import { colors } from '../../theme/tokens';

const INITIAL_CENTER = { latitude: 40.370171, longitude: 49.843383 };
const INITIAL_ZOOM = 16;

const provider =
  Platform.OS === 'android' || config.googleMapsIosKey.length > 0 ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
const supportsHeatmap = provider === PROVIDER_GOOGLE;

interface MapViewProps {
  places: PlaceDto[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  heatmapPoints?: SignedPoint[] | null;
  routeStops?: PlaceDto[] | null;
  bottomInset: number;
  topInset: number;
}

export function MapView({
  places,
  selectedPlaceId,
  onSelectPlace,
  heatmapPoints,
  routeStops,
  bottomInset,
  topInset,
}: MapViewProps) {
  const { width, height } = useWindowDimensions();
  const mapRef = useRef<RNMapView>(null);
  const aspectRatio = height / width;
  const [region, setRegion] = useState<Region>(() =>
    regionForZoom(INITIAL_CENTER.latitude, INITIAL_CENTER.longitude, INITIAL_ZOOM, aspectRatio),
  );

  useEffect(() => {
    if (!selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    mapRef.current?.animateCamera({ center: { latitude: place.latitude, longitude: place.longitude } }, { duration: 350 });
  }, [selectedPlaceId, places]);

  useEffect(() => {
    if (!routeStops || routeStops.length === 0) return;
    mapRef.current?.fitToCoordinates(
      routeStops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
      { edgePadding: { top: topInset + 60, right: 60, bottom: bottomInset + 60, left: 60 }, animated: true },
    );
  }, [routeStops, bottomInset, topInset]);

  return (
    <RNMapView
      ref={mapRef}
      provider={provider}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onRegionChangeComplete={setRegion}
      customMapStyle={darkMapStyle}
      userInterfaceStyle="dark"
      mapPadding={{ top: topInset, right: 0, bottom: bottomInset, left: 0 }}
      showsCompass={false}
      showsPointsOfInterests={false}
      showsBuildings={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      loadingEnabled
      loadingBackgroundColor={colors.ground}
      loadingIndicatorColor={colors.brand[500]}
    >
      {heatmapPoints && <HeatmapOverlay points={heatmapPoints} supportsHeatmap={supportsHeatmap} />}
      <PlaceMarkers
        places={places}
        region={region}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={onSelectPlace}
        onExpandCluster={(latitude, longitude, zoom) =>
          mapRef.current?.animateToRegion(regionForZoom(latitude, longitude, zoom, aspectRatio), 300)
        }
      />
      {routeStops && <RoutePolyline stops={routeStops} />}
      {routeStops && <RouteStopMarkers stops={routeStops} />}
    </RNMapView>
  );
}
