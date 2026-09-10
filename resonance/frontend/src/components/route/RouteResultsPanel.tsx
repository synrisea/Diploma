import { getCategoryStyle } from '../../lib/categoryStyles';
import { useRoute } from '../../route/RouteContext';

interface RouteResultsPanelProps {
  onBack: () => void;
}

export function RouteResultsPanel({ onBack }: RouteResultsPanelProps) {
  const { routeStops, clearRoute } = useRoute();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-900/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to list
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-stone-900">Route</h2>
          <button
            type="button"
            onClick={() => {
              clearRoute();
              onBack();
            }}
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            Clear route
          </button>
        </div>

        {routeStops && routeStops.length > 0 ? (
          <ol className="mt-4 flex flex-col gap-2">
            {routeStops.map((stop, i) => {
              const style = getCategoryStyle(stop.categoryName);
              return (
                <li key={stop.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10 font-mono text-[11px] font-semibold text-brand-500 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">{stop.name}</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500">{style.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-stone-500">Plan a route from the search bar above to see it here.</p>
        )}
      </div>
    </div>
  );
}
