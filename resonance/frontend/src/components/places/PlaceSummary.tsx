import { usePlaceSummary } from '../../hooks/usePlaceSummary';

export function PlaceSummary({ placeId, placeName }: { placeId: string; placeName: string }) {
  const { data, isLoading } = usePlaceSummary(placeId, placeName);

  if (isLoading || !data?.summary) return null;

  return (
    <div className="mt-4 rounded-xl border border-stone-900/10 bg-stone-900/[0.025] px-3.5 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">What people say</p>
      <p className="mt-1.5 text-sm text-stone-700">{data.summary}</p>
    </div>
  );
}
