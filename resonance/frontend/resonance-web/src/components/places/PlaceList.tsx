import type { PlaceDto } from '../../types/place';
import { PlaceCard } from './PlaceCard';

interface PlaceListProps {
  places: PlaceDto[];
  isLoading: boolean;
  isError: boolean;
  selectedPlaceId: string | null;
  onSelect: (id: string) => void;
}

export function PlaceList({ places, isLoading, isError, selectedPlaceId, onSelect }: PlaceListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-medium text-stone-500">
          {isLoading ? 'Loading places…' : `${places.length} place${places.length === 1 ? '' : 's'} in view`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isError && (
          <div className="p-4 text-sm text-red-700">
            Couldn't reach the Resonance API. Confirm the backend is running on port 5112.
          </div>
        )}

        {!isError && !isLoading && places.length === 0 && (
          <div className="p-4 text-sm text-stone-500">
            No places in this area yet. Pan or zoom out to explore more of Torgovy.
          </div>
        )}

        {places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            isSelected={place.id === selectedPlaceId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
