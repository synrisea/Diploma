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
  const value = mode === null ? 'off' : mode.kind === 'overall' ? 'overall' : `dimension:${mode.dimensionId}`;

  const handleChange = (next: string) => {
    if (next === 'off') return onModeChange(null);
    if (next === 'overall') return onModeChange({ kind: 'overall' });
    onModeChange({ kind: 'dimension', dimensionId: Number(next.split(':')[1]) });
  };

  return (
    <div className="absolute right-4 top-4 z-[1000] w-56 rounded-md border border-stone-200 bg-white p-3 shadow-sm">
      <label className="mb-1.5 block text-xs font-medium text-stone-500">Heatmap</label>
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-brand-500 focus:outline-none"
      >
        <option value="off">Off</option>
        <option value="overall">Overall sentiment</option>
        {sortedDimensions.map((dimension) => (
          <option key={dimension.id} value={`dimension:${dimension.id}`}>
            {dimension.label} ({dimension.commentCount})
          </option>
        ))}
      </select>

      {mode !== null && (
        <div className="mt-2.5 flex items-center gap-3 text-xs text-stone-500">
          {(mode.kind === 'overall' || activeDimension?.sentiment === 'positive') && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Positive
            </span>
          )}
          {(mode.kind === 'overall' || activeDimension?.sentiment === 'negative') && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Negative
            </span>
          )}
          {activeDimension?.sentiment === 'mixed' && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Mixed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
