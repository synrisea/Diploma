import type { PlaceDto } from '../../types/place';
import { getCategoryStyle } from '../../lib/categoryStyles';

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
          className="text-sm font-medium text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-rose-700"
        >
          ← Back to list
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

        {place.address ? (
          <p className="mt-1 text-sm text-stone-500">{place.address}</p>
        ) : (
          <p className="mt-1 text-sm text-stone-400 italic">No address on record yet</p>
        )}

        <dl className="mt-6 space-y-3 border-t border-stone-200 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Coordinates</dt>
            <dd className="font-mono text-stone-700 tabular-nums">
              {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-sm text-stone-400">
          Community feedback, ratings, and AI summaries for this place aren't collected yet — that's the next
          phase of Resonance.
        </p>
      </div>
    </div>
  );
}
