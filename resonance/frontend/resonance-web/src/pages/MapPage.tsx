import { useMemo, useState } from 'react';
import { MapView } from '../components/map/MapView';
import { HeatmapControl } from '../components/map/HeatmapControl';
import { buildHeatmapPoints, type HeatmapMode } from '../components/map/heatmapPoints';
import { PlaceList } from '../components/places/PlaceList';
import { PlaceDetailPanel } from '../components/places/PlaceDetailPanel';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import { useDimensions } from '../hooks/useDimensions';
import { usePlaceSentiment } from '../hooks/usePlaceSentiment';
import type { BoundingBox } from '../types/place';

export function MapPage() {
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode | null>(null);

  const { data: places = [], isLoading, isError } = usePlacesInBoundingBox(bbox);
  const { data: dimensions = [] } = useDimensions();
  const { data: placeSentiment = [] } = usePlaceSentiment();

  const heatmapPoints = useMemo(
    () => buildHeatmapPoints(heatmapMode, places, placeSentiment, dimensions),
    [heatmapMode, places, placeSentiment, dimensions],
  );

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    setIsSidebarOpen(true);
  };

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <aside
        className={`shrink-0 overflow-hidden border-stone-200 bg-white transition-[width] duration-200 ${
          isSidebarOpen ? 'w-96 border-r' : 'w-0 border-r-0'
        }`}
      >
        <div className="h-full w-96">
          {selectedPlace ? (
            <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
          ) : (
            <PlaceList
              places={places}
              isLoading={isLoading}
              isError={isError}
              selectedPlaceId={selectedPlaceId}
              onSelect={handleSelectPlace}
            />
          )}
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        className={`absolute top-1/2 z-[1000] flex h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-stone-200 bg-white text-stone-400 shadow-sm transition-[left] duration-200 hover:text-stone-700 ${
          isSidebarOpen ? 'left-96' : 'left-0'
        }`}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <main className="relative flex-1">
        <MapView
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlace}
          onBoundsChange={setBbox}
          resizeTrigger={isSidebarOpen}
          heatmapPoints={heatmapMode ? heatmapPoints : null}
        />
        <HeatmapControl mode={heatmapMode} onModeChange={setHeatmapMode} dimensions={dimensions} />
      </main>
    </div>
  );
}
