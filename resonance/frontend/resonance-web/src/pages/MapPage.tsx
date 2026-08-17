import { useMemo, useState } from 'react';
import { MapView } from '../components/map/MapView';
import { buildHeatmapPoints } from '../components/map/heatmapPoints';
import { PlaceList } from '../components/places/PlaceList';
import { PlaceDetailPanel } from '../components/places/PlaceDetailPanel';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import { useDimensions } from '../hooks/useDimensions';
import { usePlaceSentiment } from '../hooks/usePlaceSentiment';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useHeatmap } from '../heatmap/HeatmapContext';
import type { BoundingBox } from '../types/place';

type MobileView = 'list' | 'map';

export function MapPage() {
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { mode: heatmapMode } = useHeatmap();
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
  // viewport rather than being confined to the desktop's floating rail.
  const showingDetail = selectedPlace !== null;
  const isListPanelActive = showingDetail || mobileView === 'list';
  const isMapPanelActive = !showingDetail && mobileView === 'map';

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    setIsSidebarOpen(true);
  };

  return (
    <div className="relative flex flex-1 overflow-hidden bg-ground">
      {/*
        Mobile List/Map panels are always mounted at full size and stacked via
        absolute positioning, toggled with opacity/pointer-events rather than
        display:none. A map that mounts (or briefly sits) at display:none gets
        a zero-size container from Leaflet's perspective - it never recovers
        real bounds until a user pans it - so the inactive layer needs to stay
        laid out, just invisible and non-interactive. Desktop reverts to a
        floating glass rail inset from the map, both panels always visible.
      */}
      <aside
        // pointer-events-none/opacity-0 alone hide a panel visually but leave its
        // buttons in the keyboard tab order - inert removes focusability too, but
        // only on mobile, where the two panels are true alternates; on desktop
        // both stay simultaneously interactive regardless of the mobile toggle.
        inert={isMobile && !isListPanelActive}
        className={`absolute inset-0 z-10 overflow-hidden bg-ground-2 transition-[opacity,width,margin,border-radius] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:static md:z-auto md:opacity-100 md:pointer-events-auto md:shrink-0 md:border md:border-stone-900/10 md:bg-panel/92 md:shadow-[0_20px_60px_-25px_rgba(0,0,0,0.8)] md:backdrop-blur-sm ${
          isListPanelActive ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${isSidebarOpen ? 'md:m-4 md:w-96 md:rounded-[1.75rem]' : 'md:m-0 md:w-0 md:rounded-none md:border-0'}`}
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
        className={`absolute top-1/2 z-[1000] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-900/10 bg-panel/95 text-stone-500 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)] transition-[left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 md:flex ${
          isSidebarOpen ? 'left-[25.5rem]' : 'left-4'
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
      </main>

      {!showingDetail && (
        <div className="absolute bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 gap-0.5 rounded-full border border-stone-900/10 bg-panel/95 p-1 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.85)] backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileView('list')}
            aria-pressed={mobileView === 'list'}
            className={`rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              mobileView === 'list' ? 'bg-brand-500 text-brand-ink' : 'text-stone-500'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setMobileView('map')}
            aria-pressed={mobileView === 'map'}
            className={`rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
              mobileView === 'map' ? 'bg-brand-500 text-brand-ink' : 'text-stone-500'
            }`}
          >
            Map
          </button>
        </div>
      )}
    </div>
  );
}
