import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMyVisitIntents } from '../hooks/useMyVisitIntents';
import { useDeleteVisitIntent } from '../hooks/useDeleteVisitIntent';
import { usePlacesInBoundingBox } from '../hooks/usePlacesInBoundingBox';
import { DISTRICT_BOUNDS } from '../lib/mapConstants';
import { BackLink } from '../components/layout/BackLink';
import { formatVisitDate } from '../lib/formatVisitDate';

const labelClass = 'font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500';
const dangerLinkButtonClass =
  'shrink-0 text-sm font-medium text-sentiment-negative transition-opacity hover:opacity-75 disabled:opacity-50';

export function PlansPage() {
  const { isAuthenticated } = useAuth();
  const { data: intents = [], isLoading } = useMyVisitIntents();
  const { data: places = [] } = usePlacesInBoundingBox(DISTRICT_BOUNDS);
  const cancelIntent = useDeleteVisitIntent();

  const placeNameById = useMemo(() => new Map(places.map((p) => [p.id, p.name])), [places]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <BackLink />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <p className={labelClass}>Visits</p>
          <h1 className="mt-1 font-display text-3xl text-stone-900">My plans</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : intents.length === 0 ? (
          <p className="text-sm text-stone-500">
            No plans yet. Pick a place on the map and say when you're going.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {intents.map((intent) => (
              <li
                key={intent.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {placeNameById.get(intent.placeId) ?? 'Somewhere'}
                  </p>
                  <p className="font-mono text-[11px] text-stone-500">
                    {formatVisitDate(intent.visitDate)}
                    {intent.intentTag ? ` · ${intent.intentTag}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cancelIntent.mutate(intent.id)}
                  disabled={cancelIntent.isPending}
                  className={dangerLinkButtonClass}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
