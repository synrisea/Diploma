import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';
import { CommentList } from '../feedback/CommentList';
import { CommentForm } from '../feedback/CommentForm';

interface PlaceDetailPanelProps {
  place: PlaceDto;
  onBack: () => void;
}

export function PlaceDetailPanel({ place, onBack }: PlaceDetailPanelProps) {
  const style = getCategoryStyle(place.categoryName);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to list
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: style.color }}
        >
          {style.label}
        </span>

        <h2 className="mt-3 text-xl font-semibold text-stone-900">{place.name}</h2>

        {place.address && <p className="mt-1 text-sm text-stone-500">{place.address}</p>}

        <div className="mt-6 border-t border-stone-200 pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-stone-400">Comments</h3>
          <div className="mt-3">
            <CommentList placeId={place.id} />
          </div>
        </div>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <CommentForm placeId={place.id} />
        </div>
      </div>
    </div>
  );
}
