import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { MapView } from '@/components/map/MapView';
import { buildHeatmapPoints } from '@/components/map/heatmapPoints';
import { PlaceList } from '@/components/places/PlaceList';
import { PlaceDetailPanel } from '@/components/places/PlaceDetailPanel';
import { RouteResultsPanel } from '@/components/route/RouteResultsPanel';
import { MapTopBar } from '@/components/layout/MapTopBar';
import { sheetBackgroundStyle, sheetHandleStyle } from '@/components/layout/SheetMenu';
import { usePlacesInBoundingBox } from '@/hooks/usePlacesInBoundingBox';
import { useDimensions } from '@/hooks/useDimensions';
import { usePlaceSentiment } from '@/hooks/usePlaceSentiment';
import { useHeatmap } from '@/heatmap/HeatmapContext';
import { useRoute } from '@/route/RouteContext';
import { DISTRICT_BOUNDS } from '@/lib/mapConstants';

type SidebarMode = 'list' | 'place' | 'route';

const SNAP_POINTS = ['14%', '48%', '90%'];
const SNAP_FRACTIONS = [0.14, 0.48, 0.9];

export default function MapScreen() {
  const { height } = useWindowDimensions();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('list');
  const [sheetIndex, setSheetIndex] = useState(1);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const sheetRef = useRef<BottomSheet>(null);
  const { mode: heatmapMode } = useHeatmap();
  const { routeStops } = useRoute();

  const { data: places = [], isLoading, isError } = usePlacesInBoundingBox(DISTRICT_BOUNDS);
  const { data: dimensions = [] } = useDimensions();
  const { data: placeSentiment = [] } = usePlaceSentiment();

  const heatmapPoints = useMemo(
    () => buildHeatmapPoints(heatmapMode, places, placeSentiment, dimensions),
    [heatmapMode, places, placeSentiment, dimensions],
  );

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;
  const showingDetail = selectedPlace !== null;
  const showingRoutePanel = !showingDetail && sidebarMode === 'route';

  useEffect(() => {
    if (routeStops) {
      setSelectedPlaceId(null);
      setSidebarMode('route');
      sheetRef.current?.snapToIndex(1);
    }
  }, [routeStops]);

  const handleSelectPlace = useCallback((id: string) => {
    setSelectedPlaceId(id);
    setSidebarMode('place');
    sheetRef.current?.snapToIndex(2);
  }, []);

  const backToList = useCallback(() => {
    setSelectedPlaceId(null);
    setSidebarMode('list');
    sheetRef.current?.snapToIndex(1);
  }, []);

  const bottomInset = Math.round(height * SNAP_FRACTIONS[Math.min(Math.max(sheetIndex, 0), 1)]);

  return (
    <View className="flex-1 bg-ground">
      <MapView
        places={places}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={handleSelectPlace}
        heatmapPoints={heatmapMode ? heatmapPoints : null}
        routeStops={routeStops}
        bottomInset={bottomInset}
        topInset={topBarHeight}
      />

      <MapTopBar onLayoutHeight={setTopBarHeight} />

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={SNAP_POINTS}
        onChange={setSheetIndex}
        backgroundStyle={sheetBackgroundStyle}
        handleIndicatorStyle={sheetHandleStyle}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        {selectedPlace ? (
          <PlaceDetailPanel place={selectedPlace} onBack={backToList} />
        ) : showingRoutePanel ? (
          <RouteResultsPanel onBack={backToList} />
        ) : (
          <PlaceList
            places={places}
            isLoading={isLoading}
            isError={isError}
            selectedPlaceId={selectedPlaceId}
            onSelect={handleSelectPlace}
          />
        )}
      </BottomSheet>
    </View>
  );
}
