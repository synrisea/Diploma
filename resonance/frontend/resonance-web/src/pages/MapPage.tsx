import { useMemo, useState } from 'react';
import { MapView } from '../components/map/MapView';
import { HeatmapControl } from '../components/map/HeatmapControl';
import { buildHeatmapPoints, type HeatmapMode } from '../components/map/heatmapPoints';
import { PlaceList } from '../components/places/PlaceList';
import { PlaceDetailPanel } from '../components/places/PlaceDetailPanel';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import { useDimensions } from '../hooks/useDimensions';
import { usePlaceSentiment } from '../hooks/usePlaceSentiment';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { BoundingBox } from '../types/place';

type MobileView = 'list' | 'map';

export function MapPage() {
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const isMobile = useMediaQuery('(max-width: 767px)');

  const { data: places = [], isLoading, isError } = usePlacesInBoundingBox(bbox);
  const { data: dimensions = [] } = useDimensions();
  const { data: placeSentiment = [] } = usePlaceSentiment();

  const heatmapPoints = useMemo(
    () => buildHeatmapPoints(heatmapMode, places, placeSentiment, dimensions),
    [heatmapMode, places, placeSentiment, dimensions],
  );

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;
  // On mobile the detail panel is a full-screen takeover regardless of the
  // list/map toggle - it lives inside the aside slot but claims the whole
  // viewport rather than being confined to the desktop's 384px rail.
  const showingDetail = selectedPlace !== null;
  const isListPanelActive = showingDetail || mobileView === 'list';
  const isMapPanelActive = !showingDetail && mobileView === 'map';

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    setIsSidebarOpen(true);
  };

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/*
        Mobile List/Map panels are always mounted at full size and stacked via
        absolute positioning, toggled with opacity/pointer-events rather than
        display:none. A map that mounts (or briefly sits) at display:none gets
        a zero-size container from Leaflet's perspective - it never recovers
        real bounds until a user pans it - so the inactive layer needs to stay
        laid out, just invisible and non-interactive. Desktop reverts to a
        normal static side-by-side flex layout, both panels always visible.
      */}
      <aside
        // pointer-events-none/opacity-0 alone hide a panel visually but leave its
        // buttons in the keyboard tab order - inert removes focusability too, but
        // only on mobile, where the two panels are true alternates; on desktop
        // both stay simultaneously interactive regardless of the mobile toggle.
        inert={isMobile && !isListPanelActive}
        className={`absolute inset-0 z-10 overflow-hidden border-stone-200 bg-white transition-[opacity,width] duration-200 md:static md:z-auto md:opacity-100 md:pointer-events-auto md:shrink-0 ${
          isListPanelActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${isSidebarOpen ? 'md:w-96 md:border-r' : 'md:w-0 md:border-r-0'}`}
      >
        <div className="h-full w-full md:w-96">
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

      {/* Desktop-only collapse rail - mobile uses the List/Map toggle below instead. */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        className={`absolute top-1/2 z-[1000] hidden h-12 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-stone-200 bg-white text-stone-400 shadow-sm transition-[left] duration-200 hover:text-stone-700 md:flex ${
          isSidebarOpen ? 'left-96' : 'left-0'
        }`}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <main
        inert={isMobile && !isMapPanelActive}
        className={`absolute inset-0 z-0 transition-opacity duration-200 md:static md:z-auto md:flex-1 md:opacity-100 md:pointer-events-auto ${
          isMapPanelActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <MapView
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlace}
          onBoundsChange={setBbox}
          resizeTrigger={`${isSidebarOpen}-${mobileView}-${showingDetail}`}
          heatmapPoints={heatmapMode ? heatmapPoints : null}
        />
        <HeatmapControl mode={heatmapMode} onModeChange={setHeatmapMode} dimensions={dimensions} />
      </main>

      {!showingDetail && (
        <div className="absolute bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 gap-0.5 rounded-full border border-stone-200 bg-white p-1 shadow-md md:hidden">
          <button
            type="button"
            onClick={() => setMobileView('list')}
            aria-pressed={mobileView === 'list'}
            className={`rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              mobileView === 'list' ? 'bg-brand-500 text-white' : 'text-stone-500'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setMobileView('map')}
            aria-pressed={mobileView === 'map'}
            className={`rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              mobileView === 'map' ? 'bg-brand-500 text-white' : 'text-stone-500'
            }`}
          >
            Map
          </button>
        </div>
      )}
    </div>
  );
}
