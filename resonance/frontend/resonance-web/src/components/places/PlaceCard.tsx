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
      className={`w-full border-b border-stone-900/10 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 ${
        isSelected ? 'bg-brand-500/10' : 'hover:bg-stone-900/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: style.color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900">{place.name}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500">{style.label}</p>
          {place.address && <p className="mt-0.5 truncate text-sm text-stone-500">{place.address}</p>}
        </div>
      </div>
    </button>
  );
}
