import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';

interface PlaceCardProps {
  place: PlaceDto;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  const style = getCategoryStyle(place.categoryName);

  return (
    <button
      type="button"
      onClick={() => onSelect(place.id)}
      className={`w-full text-left px-4 py-3 border-b border-stone-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 ${
        isSelected ? 'bg-brand-50' : 'hover:bg-stone-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: style.color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900">{place.name}</p>
          <p className="text-sm text-stone-500">{style.label}</p>
          {place.address && <p className="mt-0.5 truncate text-sm text-stone-400">{place.address}</p>}
        </div>
      </div>
    </button>
  );
}
