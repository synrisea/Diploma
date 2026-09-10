import { useState, type FormEvent } from 'react';
import { useRoute } from '../../route/RouteContext';

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function RouteSearchBar() {
  const [wish, setWish] = useState('');
  const { planRoute, isPlanning, isError, error, hasEmptyResult, clearRoute } = useRoute();

  const showFeedback = isPlanning || isError || hasEmptyResult;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = wish.trim();
    if (!trimmed || isPlanning) return;
    planRoute(trimmed);
  };

  return (
    <div className="relative w-40 shrink sm:w-56">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-stone-900/[0.03] px-2.5 py-1 transition-colors focus-within:border-brand-500"
      >
        <span className="shrink-0 text-stone-500">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={wish}
          onChange={(e) => {
            setWish(e.target.value);
            if (isError || hasEmptyResult) clearRoute();
          }}
          placeholder="Plan a route…"
          disabled={isPlanning}
          className="min-w-0 flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none disabled:opacity-50"
        />
        {wish.trim() && (
          <button
            type="submit"
            disabled={isPlanning}
            className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-brand-ink transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {isPlanning ? '…' : 'Go'}
          </button>
        )}
      </form>

      {showFeedback && (
        <div className="absolute top-11 left-0 z-[1100] w-72 max-w-[90vw] rounded-2xl border border-stone-900/10 bg-panel/95 px-4 py-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          {isPlanning && (
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-stone-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 shadow-[0_0_8px_1px_rgba(255,106,57,0.7)]" />
              Reading the map… this can take a moment
            </p>
          )}
          {isError && (
            <p className="text-sm text-sentiment-negative">
              {error instanceof Error ? error.message : 'Something went wrong.'}
            </p>
          )}
          {hasEmptyResult && (
            <p className="text-sm text-stone-500">No places match that yet. Try rephrasing your wish.</p>
          )}
        </div>
      )}
    </div>
  );
}
