import { useState } from 'react';
import { MapView } from '../components/map/MapView';
import { PlaceList } from '../components/places/PlaceList';
import { PlaceDetailPanel } from '../components/places/PlaceDetailPanel';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import type { BoundingBox } from '../types/place';

export function MapPage() {
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const { data: places = [], isLoading, isError } = usePlacesInBoundingBox(bbox);

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-96 shrink-0 border-r border-stone-200">
        {selectedPlace ? (
          <PlaceDetailPanel place={selectedPlace} onBack={() => setSelectedPlaceId(null)} />
        ) : (
          <PlaceList
            places={places}
            isLoading={isLoading}
            isError={isError}
            selectedPlaceId={selectedPlaceId}
            onSelect={setSelectedPlaceId}
          />
        )}
      </aside>
      <main className="flex-1">
        <MapView
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onBoundsChange={setBbox}
        />
      </main>
    </div>
  );
}
