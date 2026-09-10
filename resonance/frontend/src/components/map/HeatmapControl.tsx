import { useMemo } from 'react';
import type { Dimension } from '../../types/dimensions';
import type { HeatmapMode } from './heatmapPoints';

interface HeatmapControlProps {
  mode: HeatmapMode | null;
  onModeChange: (mode: HeatmapMode | null) => void;
  dimensions: Dimension[];
}

export function HeatmapControl({ mode, onModeChange, dimensions }: HeatmapControlProps) {
  const sortedDimensions = useMemo(
    () => [...dimensions].sort((a, b) => b.commentCount - a.commentCount),
    [dimensions],
  );

  const activeDimension = mode?.kind === 'dimension' ? sortedDimensions.find((d) => d.id === mode.dimensionId) : null;

  const pillClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 ${
      active
        ? 'border-brand-500 bg-brand-500 text-brand-ink'
        : 'border-stone-900/15 bg-stone-900/5 text-stone-500 hover:border-brand-500/40 hover:text-stone-900'
    }`;

  return (
    <div className="w-48 p-3.5 sm:w-72">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">Heatmap</p>

      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
        <button type="button" onClick={() => onModeChange(null)} className={pillClass(mode === null)}>
          Off
        </button>
        <button
          type="button"
          onClick={() => onModeChange({ kind: 'overall' })}
          className={pillClass(mode?.kind === 'overall')}
        >
          Overall
        </button>
        {sortedDimensions.map((dimension) => (
          <button
            key={dimension.id}
            type="button"
            onClick={() => onModeChange({ kind: 'dimension', dimensionId: dimension.id })}
            className={pillClass(mode?.kind === 'dimension' && mode.dimensionId === dimension.id)}
          >
            {dimension.label}
          </button>
        ))}
      </div>

      {mode !== null && (
        <div className="mt-3 flex items-center gap-3 border-t border-stone-900/10 pt-2.5 font-mono text-[10px] text-stone-500">
          {(mode.kind === 'overall' || activeDimension?.sentiment === 'positive') && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sentiment-positive" /> Positive
            </span>
          )}
          {(mode.kind === 'overall' || activeDimension?.sentiment === 'negative') && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sentiment-negative" /> Negative
            </span>
          )}
          {activeDimension?.sentiment === 'mixed' && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sentiment-mixed" /> Mixed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
