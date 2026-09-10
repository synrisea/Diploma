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
      <div className="border-b border-stone-900/10 px-4 py-3.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500 tabular-nums">
          {isLoading ? 'Reading signal…' : `${places.length} place${places.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isError && (
          <div className="p-4 text-sm text-sentiment-negative">
            Couldn't reach the Resonance API. Confirm the backend is running on port 5112.
          </div>
        )}

        {!isError && !isLoading && places.length === 0 && (
          <div className="p-4 text-sm text-stone-500">
            No places in this area yet. Pan or zoom out to explore more of the map.
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
